const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_CONFIG = `
        release {
            if (project.hasProperty('LOUCHE_UPLOAD_STORE_FILE')) {
                storeFile file(LOUCHE_UPLOAD_STORE_FILE)
                storePassword LOUCHE_UPLOAD_STORE_PASSWORD
                keyAlias LOUCHE_UPLOAD_KEY_ALIAS
                keyPassword LOUCHE_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (!gradle.includes('LOUCHE_UPLOAD_STORE_FILE')) {
      gradle = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${SIGNING_CONFIG}`);
      gradle = gradle.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
        "$1signingConfig project.hasProperty('LOUCHE_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      );
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
