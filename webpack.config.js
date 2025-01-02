// webpack.config.js
const path = require('path');

module.exports = {
  // ... other configurations ...
  resolve: {
    alias: {
      // Alias for Platform module
      '../../Utilities/Platform': 'react-native-web/dist/exports/Platform',
    },
    // ... other resolve configurations ...
  },
  // ... other configurations ...
};
