import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:/curriculum-(g[12]|g4ab|g4c)\.spec\.ts/,workers:1,timeout:60000,
 outputDir:'test-results/g4c',reporter:'list',
 use:{baseURL:'http://127.0.0.1:33131',browserName:'chromium',trace:'retain-on-failure',permissions:['camera'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
 webServer:{command:'node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 33131',url:'http://127.0.0.1:33131',reuseExistingServer:false,timeout:60000},
});
