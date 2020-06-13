import {browser} from 'webextension-polyfill-ts';

import {processThumbnailMessage} from './background/fetchThumbnail';
import {processGifRequest} from './background/gifRequests';
import {getValidatedSettings, setupSettingsInBackground} from './services/backgroundSettings';
import {BTDMessageEvent, BTDMessages} from './types/betterTweetDeck/btdMessageTypes';

(async () => {
  await setupSettingsInBackground();

  browser.runtime.onMessage.addListener(async (request: BTDMessageEvent, sender) => {
    if (
      sender.url !== 'https://tweetdeck.twitter.com/' ||
      !String(sender.id).includes('erambert.me') ||
      !String(sender.id).includes('BetterTweetDeck')
    ) {
      throw new Error('Message not coming from BTD');
    }

    if (request.data.name === BTDMessages.FETCH_THUMBNAIL) {
      return await processThumbnailMessage(request.data);
    }

    if (request.data.name === BTDMessages.MAKE_GIF_REQUEST) {
      return await processGifRequest(request.data);
    }

    return undefined;
  });

  // // Get the settings from the browser.
  const settings = await getValidatedSettings();
  const textLimitWithLink = 254;

  if (settings.enableShareItem) {
    browser.contextMenus.create({
      title: 'Share on BTD',
      contexts: ['page', 'selection', 'image', 'link'],
      onclick: async (info, tab) => {
        const urlToShare = info.linkUrl || info.srcUrl || info.pageUrl;
        const baseText = info.selectionText || tab.title || '';
        const textToShare = !settings.shouldShortenSharedText
          ? baseText
          : baseText.slice(0, textLimitWithLink) + '…';

        const tabs = await browser.tabs.query({
          url: '*://tweetdeck.twitter.com/*',
        });

        if (tabs.length === 0) {
          return;
        }

        const TweetDeckTab = tabs[0];

        if (!TweetDeckTab.id || !TweetDeckTab.windowId) {
          return;
        }

        await browser.windows.update(TweetDeckTab.windowId, {
          focused: true,
        });

        await browser.tabs.update(TweetDeckTab.id, {active: true});
        browser.tabs.sendMessage(TweetDeckTab.id, {
          action: 'share',
          text: textToShare,
          url: urlToShare,
        });
      },
    });
  }
})();

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (
      (details.type !== 'main_frame' && details.type !== 'sub_frame') ||
      !details.responseHeaders
    ) {
      return undefined;
    }

    return {
      responseHeaders: Array.from(details.responseHeaders).filter((h) => {
        return h.name && h.name !== 'content-security-policy';
      }),
    };
  },
  {
    urls: ['https://tweetdeck.twitter.com/*'],
  },
  ['responseHeaders', 'blocking']
);