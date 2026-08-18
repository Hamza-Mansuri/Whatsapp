const { chromium, devices } = require('playwright');

(async () => {
  // We will try to launch the browser using the local playwright installation
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  console.log('Testing Desktop View...');
  const desktopContext = await browser.newContext();
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173');
  await desktopPage.screenshot({ path: 'desktop-screenshot.png', fullPage: true });
  console.log('Saved desktop-screenshot.png');
  
  // Mobile
  console.log('Testing Mobile View...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13']
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173');
  await mobilePage.screenshot({ path: 'mobile-screenshot.png', fullPage: true });
  console.log('Saved mobile-screenshot.png');
  
  await browser.close();
  console.log('Done.');
})();
