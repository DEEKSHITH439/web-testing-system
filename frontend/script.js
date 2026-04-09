const BASE_URL = window.location.origin;

async function runTest() {
    const url = document.getElementById("urlInput").value.trim();
    const btn = document.getElementById("btn");
    const resultDiv = document.getElementById("result");
    const seoDiv = document.getElementById("seoBox");
    const img = document.getElementById("img");
    const pdf = document.getElementById("pdf");

    console.log("runTest called with URL:", url);

    if (btn.disabled) return;

    if (!url) {
        alert("Enter URL");
        return;
    }

    let fullUrl = url;
    if (!url.startsWith("http")) {
        fullUrl = "https://" + url;
    }

    try {
        new URL(fullUrl);
    } catch {
        alert("Invalid URL");
        return;
    }

    // UI loading
    btn.disabled = true;
    btn.innerText = "Running...";
    document.getElementById("loading").innerText = "⏳ Running Test...";

    resultDiv.innerHTML = "";
    seoDiv.classList.add("hidden");
    img.classList.add("hidden");
    pdf.classList.add("hidden");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
        console.log("Sending fetch to:", `${BASE_URL}/run-test?url=${encodeURIComponent(fullUrl)}`);
        const res = await fetch(
            `${BASE_URL}/run-test?url=${encodeURIComponent(fullUrl)}`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        console.log("Fetch response status:", res.status);

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || `Request failed with status ${res.status}`);
        }

        const data = await res.json();

        console.log("Received data:", data);

        console.log("About to update resultDiv");

        // ✅ SAFETY (VERY IMPORTANT)
        const brokenLinks = data.brokenLinks || [];
        const totalLinks = data.totalLinks || 0;
        const checkedLinks = data.checkedLinks || 0;
        const score = data.score || 0;
        const loadTime = data.loadTime || 0;
        const imageCount = data.imageCount || 0;
        const scriptCount = data.scriptCount || 0;
        const headingCount = data.headingCount || 0;
        const formCount = data.formCount || 0;
        const inputCount = data.inputCount || 0;
        const accessibilityScore = data.accessibilityScore || 0;
        const securityScore = data.securityScore || 0;
        const httpsStatus = data.httpsStatus || 'Unknown';
        const mobileFriendly = data.mobileFriendly || 'Unknown';
        const wordCount = data.wordCount || 0;
        const readabilityScore = data.readabilityScore || 0;
        const ogTags = data.ogTags || 0;
        const twitterTags = data.twitterTags || 0;
        const consoleErrors = data.consoleErrors || 0;
        const performanceMetrics = data.performanceMetrics || {};

        let scoreClass = score > 70 ? "good" : "bad";

        let performance =
            loadTime < 2 ? "Fast 🚀" :
            loadTime < 4 ? "Average ⚡" :
            "Slow 🐢";

        let brokenList = brokenLinks.length > 0
            ? brokenLinks.map(link => `<li>${link}</li>`).join("")
            : "<li>None</li>";

        // 📊 RESULT
        resultDiv.innerHTML = `
            <div class="result-header">
                <div>
                    <h3>📊 Test Result</h3>
                    <p class="result-link">${fullUrl}</p>
                </div>
                <div class="score-badge ${scoreClass}">${score}/100</div>
            </div>

            <div class="summary-grid">
                <div class="stat-card">
                    <span>Load Time</span>
                    <strong>${loadTime} sec</strong>
                </div>
                <div class="stat-card">
                    <span>Performance</span>
                    <strong>${performance}</strong>
                </div>
                <div class="stat-card">
                    <span>Checked Links</span>
                    <strong>${checkedLinks}/${totalLinks}</strong>
                </div>
                <div class="stat-card">
                    <span>Broken Links</span>
                    <strong>${brokenLinks.length}</strong>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <span>Images</span>
                    <strong>${imageCount}</strong>
                </div>
                <div class="metric-card">
                    <span>Scripts</span>
                    <strong>${scriptCount}</strong>
                </div>
                <div class="metric-card">
                    <span>Headings</span>
                    <strong>${headingCount}</strong>
                </div>
                <div class="metric-card">
                    <span>Forms</span>
                    <strong>${formCount}</strong>
                </div>
                <div class="metric-card">
                    <span>Inputs</span>
                    <strong>${inputCount}</strong>
                </div>
                <div class="metric-card">
                    <span>Form Status</span>
                    <strong>${data.formTest}</strong>
                </div>
            </div>

            <div class="performance-grid">
                <div class="metric-card">
                    <span>TTFB</span>
                    <strong>${performanceMetrics.ttfb ? performanceMetrics.ttfb.toFixed(2) : 'N/A'}s</strong>
                </div>
                <div class="metric-card">
                    <span>FCP</span>
                    <strong>${performanceMetrics.fcp ? performanceMetrics.fcp.toFixed(2) : 'N/A'}s</strong>
                </div>
                <div class="metric-card">
                    <span>LCP</span>
                    <strong>${performanceMetrics.lcp ? performanceMetrics.lcp.toFixed(2) : 'N/A'}s</strong>
                </div>
                <div class="metric-card">
                    <span>CLS</span>
                    <strong>${performanceMetrics.cls ? performanceMetrics.cls.toFixed(3) : 'N/A'}</strong>
                </div>
                <div class="metric-card">
                    <span>DOM Interactive</span>
                    <strong>${performanceMetrics.domInteractive ? performanceMetrics.domInteractive.toFixed(2) : 'N/A'}s</strong>
                </div>
                <div class="metric-card">
                    <span>DOM Content Loaded</span>
                    <strong>${performanceMetrics.domContentLoaded ? performanceMetrics.domContentLoaded.toFixed(2) : 'N/A'}s</strong>
                </div>
            </div>

            <div class="details-card">
                <p><strong>Page Title:</strong> ${data.title}</p>
                <p><strong>SEO Description:</strong> ${data.seo || "Not Available"}</p>
                <p><strong>HTTPS Status:</strong> ${httpsStatus}</p>
                <p><strong>Mobile Friendly:</strong> ${mobileFriendly}</p>
                <p><strong>Accessibility Score:</strong> ${accessibilityScore}/100</p>
                <p><strong>Security Score:</strong> ${securityScore}/100</p>
                <p><strong>Word Count:</strong> ${wordCount}</p>
                <p><strong>Readability:</strong> ${readabilityScore}/100</p>
            </div>
        `;

        console.log("ResultDiv updated");

        // 🔍 SEO
        seoDiv.classList.remove("hidden");
        seoDiv.innerHTML = `
            <h3>🔍 SEO Preview</h3>
            <p>${data.seo || "Not Available"}</p>
        `;

        // 📸 Screenshot
        if (data.screenshot) {
            img.classList.remove("hidden");
            img.src = data.screenshot + "?" + new Date().getTime();
        }

        // 📄 PDF
        if (data.report) {
            pdf.classList.remove("hidden");
            pdf.href = data.report;
            pdf.innerText = "📄 Download Full Report";
        }

    } catch (err) {
        clearTimeout(timeoutId);
        console.log("Fetch error:", err);
        if (err.name === 'AbortError') {
            resultDiv.innerHTML = `<span class="bad">❌ Error: Request timed out (60 seconds)</span>`;
        } else {
            resultDiv.innerHTML = `<span class="bad">❌ Error: ${err.message}</span>`;
        }
    } finally {
        btn.disabled = false;
        btn.innerText = "Run Test";
        document.getElementById("loading").innerText = "";
    }
}