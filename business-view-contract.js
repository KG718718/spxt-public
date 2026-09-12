'use strict';

function authoritativeDebtStatus(record) {
    return String(record?.lifecycleStatus || record?.status || '');
}

module.exports = { authoritativeDebtStatus };
