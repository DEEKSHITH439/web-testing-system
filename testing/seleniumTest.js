const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

// 🔥 CONFIG
const TEST_CONFIG = {
    url: "https://www.google.com",
    timeout: 5000,
    searchText: "Selenium testing"
};

async function runTest() {
    let driver;

    // 🔥 Headless Chrome (Production level)
    let options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');

    try {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log("🚀 Starting Test...");

        // ⏱ Load Page
        let startTime = Date.now();
        await driver.get(TEST_CONFIG.url);

        // ✅ Wait for title
        await driver.wait(
            until.titleContains('Google'),
            TEST_CONFIG.timeout
        );

        let loadTime = (Date.now() - startTime) / 1000;

        let title = await driver.getTitle();
        console.log("📄 Title:", title);

        // 🔍 Interaction (REAL TEST)
        let searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys(TEST_CONFIG.searchText + Key.RETURN);

        // Wait for search results
        await driver.wait(
            until.titleContains('Google Search'),
            TEST_CONFIG.timeout
        );

        console.log("🔍 Search executed");

        // 📸 Screenshot
        let screenshot = await driver.takeScreenshot();
        fs.writeFileSync('test-screenshot.png', screenshot, 'base64');

        // 📊 RESULT OBJECT (PRO LEVEL)
        let result = {
            url: TEST_CONFIG.url,
            title,
            loadTime,
            status: title.includes("Google") ? "PASS" : "FAIL",
            timestamp: new Date().toISOString()
        };

        console.log("✅ Test Result:", result);

        return result;

    } catch (error) {
        console.error("❌ Test Failed:", error.message);

        return {
            status: "ERROR",
            error: error.message
        };

    } finally {
        if (driver) {
            await driver.quit();
            console.log("🛑 Browser Closed");
        }
    }
}

// 🔥 RUN TEST
runTest();