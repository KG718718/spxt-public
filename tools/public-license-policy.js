'use strict';
const crypto=require('node:crypto');
const LICENSE_SHA256='6503af1fae4848ab12e38e346cd01f8abb63f7dc0af877d2402aad0c7a6208a3';
function validateProjectLicense({manifest,lock,license,notices}={}) {
    if(manifest?.license!=='MIT'||lock?.packages?.['']?.license!=='MIT')
        throw Error('Project package and lockfile license must both be MIT.');
    if(manifest?.private!==true) throw Error('Keep the npm publication guard.');
    if(typeof license!=='string'||!license.trim()) throw Error('Root LICENSE is missing.');
    const normalized=license.replace(/\r\n/g,'\n');
    const digest=crypto.createHash('sha256').update(normalized).digest('hex');
    if(digest!==LICENSE_SHA256) throw Error('MIT text or attribution differs from the reviewed original.');
    if(typeof notices!=='string'||!notices.startsWith('# Third-party notices\n')||
       !notices.includes('original license')||!notices.includes('does not replace'))
        throw Error('Third-party notices must preserve independent original terms.');
    return {spdx:'MIT',attribution:'K-SESSION contributors',normalizedLicenseSha256:digest};
}
module.exports={validateProjectLicense};
