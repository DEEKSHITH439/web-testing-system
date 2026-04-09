const express = require('express');
const cors = require('cors');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(__dirname + '/../frontend'));

app.get('/run-test', async (req, res) => {
    let driver;

    try {
        let url = req.query.url;

        // ✅ URL validation
        if (!url) {
            return res.status(400).json({ error: "URL required" });
        }

        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: "Invalid URL" });
        }

        console.log("Testing:", url);

        // 🔥 Chrome options (ANTI-BOT FIX)
        let options = new chrome.Options();
        options.addArguments(
            '--headless',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            '--window-size=1920,1080',
            '--disable-extensions',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-infobars',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
            '--disable-setuid-sandbox'
        );

        const chromeBinary = process.env.CHROME_BIN || process.env.CHROME_PATH;
        if (chromeBinary) {
            options.setChromeBinaryPath(chromeBinary);
        }

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        // ⏱ Load page
        let start = Date.now();
        await driver.get(url);

        // ✅ WAIT FOR FULL LOAD (CRITICAL FIX)
        await driver.wait(async () => {
            let state = await driver.executeScript('return document.readyState');
            return state === 'complete';
        }, 30000);

        let loadTime = (Date.now() - start) / 1000;

        // 📈 Performance Metrics
        let performanceMetrics = {};
        try {
            let metrics = await driver.executeScript(`
                const nav = performance.getEntriesByType('navigation')[0] || performance.timing;
                const paintEntries = performance.getEntriesByType('paint');
                const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
                const clsEntries = performance.getEntriesByType('layout-shift');

                const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
                const lcpEntry = lcpEntries.length ? lcpEntries[lcpEntries.length - 1] : null;

                const clsValue = clsEntries.reduce((sum, entry) => {
                    return sum + (!entry.hadRecentInput ? entry.value : 0);
                }, 0);

                return {
                    ttfb: (nav.responseStart - nav.requestStart) || 0,
                    domInteractive: (nav.domInteractive - nav.fetchStart) || 0,
                    domContentLoaded: (nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart) || 0,
                    loadComplete: (nav.loadEventEnd - nav.loadEventStart) || 0,
                    fcp: fcpEntry ? fcpEntry.startTime : 0,
                    lcp: lcpEntry ? lcpEntry.startTime : 0,
                    cls: clsValue
                };
            `);

            performanceMetrics = {
                ttfb: metrics.ttfb / 1000,
                domInteractive: metrics.domInteractive / 1000,
                domContentLoaded: metrics.domContentLoaded / 1000,
                loadComplete: metrics.loadComplete / 1000,
                fcp: metrics.fcp / 1000,
                lcp: metrics.lcp / 1000,
                cls: metrics.cls
            };
        } catch (e) {
            console.log('Performance metrics error:', e.message);
            performanceMetrics = {
                ttfb: 0,
                domInteractive: 0,
                domContentLoaded: 0,
                loadComplete: loadTime,
                fcp: 0,
                lcp: 0,
                cls: 0
            };
        }

        // � Security and accessibility defaults
        let accessibilityScore = 100;
        let securityScore = 100;
        let httpsStatus = url.startsWith('https://') ? 'Secure (HTTPS)' : 'Insecure (HTTP)';
        if (!url.startsWith('https://')) securityScore -= 50;

        let mobileFriendly = 'May Not Be Mobile-Friendly';
        let wordCount = 0;
        let readabilityScore = 0;
        let ogTags = 0;
        let twitterTags = 0;
        let consoleErrors = 0;

        try {
            let viewportMeta = await driver.findElement(By.css('meta[name="viewport"]'));
            if (viewportMeta) {
                mobileFriendly = 'Likely Mobile-Friendly';
            }
        } catch {
            mobileFriendly = 'May Not Be Mobile-Friendly';
        }

        try {
            let bodyText = await driver.findElement(By.css('body')).getText();
            let words = bodyText.trim().split(/\s+/).filter(Boolean);
            wordCount = words.length;
            let sentences = bodyText.split(/[.!?]+/).filter(Boolean).length || 1;
            let avgWords = wordCount / sentences;
            readabilityScore = Math.max(0, Math.min(100, 100 - Math.max(0, (avgWords - 15) * 5)));
        } catch {}

        try {
            ogTags = (await driver.findElements(By.css('meta[property^="og:"]'))).length;
            twitterTags = (await driver.findElements(By.css('meta[name^="twitter:"]'))).length;
        } catch {}

        try {
            let logs = await driver.manage().logs().get('browser');
            consoleErrors = logs.filter(log => log.level.name === 'SEVERE').length;
            if (consoleErrors > 0) securityScore -= Math.min(consoleErrors * 5, 20);
        } catch {}

        // �📄 Title (SAFE)
        let title = "Not Available";
        try {
            title = await driver.getTitle();
        } catch {}

        // 📸 Screenshot
        let screenshotPath = __dirname + '/screenshot.png';
        try {
            let screenshot = await driver.takeScreenshot();
            fs.writeFileSync(screenshotPath, screenshot, 'base64');
        } catch {}

        // 🔗 Links (SAFE)
        let totalLinks = 0;
        let checkedLinks = 0;
        let brokenLinks = [];

        try {
            let links = await driver.findElements(By.css("a"));
            totalLinks = links.length;

            let limit = Math.min(links.length, 10);

            for (let i = 0; i < limit; i++) {
                try {
                    let href = await links[i].getAttribute("href");

                    if (!href || !href.startsWith("http")) continue;

                    checkedLinks++;

                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 5000);

                    let response = await fetch(href, { signal: controller.signal });

                    if (response.status >= 400) {
                        brokenLinks.push(href);
                    }

                } catch {
                    // skip safely
                }
            }
        } catch {}

        // 📦 Asset and structure metrics
        let imageCount = 0;
        let scriptCount = 0;
        let headingCount = 0;
        let formCount = 0;
        let inputCount = 0;

        try {
            imageCount = (await driver.findElements(By.css("img"))).length;
            scriptCount = (await driver.findElements(By.css("script"))).length;
            headingCount = (await driver.findElements(By.css("h1, h2, h3, h4, h5, h6"))).length;
            formCount = (await driver.findElements(By.css("form"))).length;
            inputCount = (await driver.findElements(By.css("input"))).length;
        } catch {}

        // 🧪 Form Test (SAFE)
        let formResult = "Not Tested";

        try {
            let inputs = await driver.findElements(By.css("input"));

            if (inputs.length > 0) {
                formResult = "Form detected ✅";
            } else {
                formResult = "No form ❌";
            }
        } catch {
            formResult = "Skipped 🔒";
        }

        // 🔍 SEO (SAFE)
        let metaDescription = "Not Available";

        try {
            let meta = await driver.findElement(By.css("meta[name='description']"));
            metaDescription = await meta.getAttribute("content");
        } catch {}

        // 📊 Score
        let score = 100;
        if (loadTime > 3) score -= 20;
        if (brokenLinks.length > 0) score -= 30;
        if (performanceMetrics.fcp > 2.5) score -= 10; // FCP should be < 2.5s
        if (performanceMetrics.cls > 0.1) score -= 10; // CLS should be < 0.1
        score = Math.max(0, score + (accessibilityScore - 100) + (securityScore - 100));

        // 📄 PDF
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(__dirname + '/report.pdf'));

        doc.fontSize(18).text("Automation Testing Report", { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`URL: ${url}`);
        doc.text(`Title: ${title}`);
        doc.text(`Load Time: ${loadTime} sec`);
        doc.text(`Score: ${score}/100`);
        doc.text(`TTFB: ${performanceMetrics.ttfb} sec`);
        doc.text(`FCP: ${performanceMetrics.fcp} sec`);
        doc.text(`LCP: ${performanceMetrics.lcp} sec`);
        doc.text(`CLS: ${performanceMetrics.cls}`);
        doc.text(`DOM Interactive: ${performanceMetrics.domInteractive} sec`);
        doc.text(`DOM Content Loaded: ${performanceMetrics.domContentLoaded} sec`);
        doc.text(`Broken Links: ${brokenLinks.length}`);
        doc.text(`Image Count: ${imageCount}`);
        doc.text(`Script Count: ${scriptCount}`);
        doc.text(`Heading Count: ${headingCount}`);
        doc.text(`Form Count: ${formCount}`);
        doc.text(`Input Count: ${inputCount}`);
        doc.text(`Form Test: ${formResult}`);
        doc.text(`SEO: ${metaDescription}`);

        doc.end();

        // ✅ FINAL RESPONSE (NO UNDEFINED VALUES)
        res.json({
            title,
            loadTime,
            totalLinks,
            checkedLinks,
            brokenLinks,
            formTest: formResult,
            score,
            seo: metaDescription,
            screenshot: `${req.protocol}://${req.get('host')}/files/screenshot.png`,
            report: `${req.protocol}://${req.get('host')}/files/report.pdf`,
            imageCount,
            scriptCount,
            headingCount,
            formCount,
            inputCount,
            accessibilityScore,
            securityScore,
            httpsStatus,
            mobileFriendly,
            wordCount,
            readabilityScore,
            ogTags,
            twitterTags,
            consoleErrors,
            performanceMetrics
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            title: "Error",
            loadTime: 0,
            totalLinks: 0,
            checkedLinks: 0,
            brokenLinks: [],
            formTest: "Error",
            score: 0,
            seo: "Error occurred"
        });

    } finally {
        if (driver) await driver.quit();
    }
});

// 📂 Static files
app.use('/files', express.static(__dirname));

// 🚀 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});