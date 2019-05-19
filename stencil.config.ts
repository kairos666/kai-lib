import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'kai',
  outputTargets:[
    { type: 'dist' },
    { type: 'docs-readme' },
    {
      type: 'www',
      serviceWorker: {
        swSrc: 'src/sw/sw.js'
      }
    }
  ]
};
