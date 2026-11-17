import {defineConfig} from '@playwright/test';
import base from './playwright.g5b.config';
export default defineConfig({...base,testMatch:/curriculum-(g[12]|g4ab|g4c|g5a|g5b|g5c)\.spec\.ts/,outputDir:'test-results/g5c'});
