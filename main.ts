// import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
// import Tesseract from 'tesseract.js';
import fs from 'fs';

import { Storage } from '@google-cloud/storage';

type ClinicData = {
    title: string;
    license: string;
    licenseDate: string;
    practitionerVet: string;
    practisingLicense: string;
    contact: string;
    address: string;
    business: string;
}

const TARGET_URL = 'https://ahis9.aphia.gov.tw/Veter/OD/HLIndex.aspx';
const TIME_OUT = 60000;
const WAIT_TIME = 3000;

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME || 'your-default-bucket-name';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
    try {
        // 1. 打開瀏覽器並前往目標網頁
        // const browser = await puppeteer.launch();
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(TARGET_URL, {
            waitUntil: 'networkidle2',
            timeout: TIME_OUT
        });

        // 2. 截取驗證碼圖片
        const captchaElement = await page.$('img#ctl00_ContentPlaceHolder1_imgValidateCode');
        if (!captchaElement) {
            console.error('找不到驗證碼圖片');
            await browser.close();
            return;
        }

        // 3. 使用 Tesseract.js 解析驗證碼
        // const captchaImage = await captchaElement.screenshot();
        // const { data: { text: captchaText } } = await Tesseract.recognize(captchaImage, 'eng');

        // 3. 取得驗證碼
        const captchaSrc = await page.evaluate((element) => element.getAttribute('src'), captchaElement);
        const captchaIdMatch = captchaSrc?.match(/id=(\d+)/);
        const captchaText = captchaIdMatch ? captchaIdMatch[1] : '';
        if (!captchaText) {
            console.error('找不到驗證碼');
            await browser.close();
            return;
        }

        // 4. 輸入驗證碼並送出表單
        await page.type('input[name="ctl00$ContentPlaceHolder1$Field_ValidateCode"]', captchaText.trim());
        await sleep(WAIT_TIME);

        // 使用 evaluate 方法來點擊按鈕
        await page.evaluate(() => {
            const btn = document.querySelector('input[name="ctl00$ContentPlaceHolder1$btnSave"]') as HTMLInputElement;
            if (btn) {
                btn.click();
            }
        });
        await sleep(WAIT_TIME);

        // 5. 等待結果頁面載入並抓取數據
        await page.waitForSelector('#ctl00_ContentPlaceHolder1_ResultInfo', {
            timeout: TIME_OUT
        });
        await sleep(WAIT_TIME);

        const content = await page.content();
        const $ = cheerio.load(content);

        // 6. 抓取並轉換資料
        const clinics: ClinicData[] = [];
        $('#ctl00_ContentPlaceHolder1_ResultInfo .row').each((i, elem) => {
            const title = $(elem).find('.title').text().trim();
            const license = $(elem).find('font:contains("開業執照：")').text().replace('開業執照：', '').trim();
            const licenseDate = $(elem).find('font:contains("發照日期：")').text().replace('發照日期：', '').trim();
            const practitionerVet = $(elem).find('font:contains("負責獸醫師(佐)：")').text().replace('負責獸醫師(佐)：', '').trim();
            const practisingLicense = $(elem).find('font:contains("執業執照：")').text().replace('執業執照：', '').trim();
            const contact = $(elem).find('font:contains("聯絡電話：")').text().replace('聯絡電話：', '').trim();
            const address = $(elem).find('font:contains("地址：")').text().replace('地址：', '').trim();
            const business = $(elem).find('font:contains("營業項目：")').text().replace('營業項目：', '').trim();

            clinics.push({
                title,
                license,
                licenseDate,
                practitionerVet,
                practisingLicense,
                contact,
                address,
                business,
            });
        });

        // 7. 將資料轉換為 JSON 並保存到文件
        const today = new Date();
        // 格式：YYYY-MM-DD
        const dateString = today.toISOString().split('T')[0];
        const fileName = `clinics_${dateString}.json`;

        fs.writeFileSync(fileName, JSON.stringify(clinics, null, 2));

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`clinics_${dateString}.json`);
        await file.save(JSON.stringify(clinics, null, 2));

        console.log(`資料已保存到 ${fileName}，共 ${clinics.length} 筆資料`);

        await browser.close();
    } catch (error) {
        console.error(error);
    }
}

main().catch(console.error);
