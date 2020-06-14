import './hideColumnIcons.css';

import {makeBTDModule} from '../types/betterTweetDeck/btdCommonTypes';

export const maybeHideColumnIcons = makeBTDModule(({settings}) => {
  if (!settings.hideColumnIcons) {
    return;
  }

  document.body.setAttribute('btd-hide-column-icons', 'true');
});
