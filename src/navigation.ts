import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Notes',
      href: getBlogPermalink(),
    },
    {
      text: 'Tags',
      href: getPermalink('/tags'),
    },
    {
      text: 'Search',
      href: getPermalink('/search'),
    },
    {
      text: 'About',
      href: getPermalink('/about'),
    },
  ],
  actions: [{ text: 'GitHub', href: 'https://github.com/Djaygo', target: '_blank', icon: 'tabler:brand-github' }],
};

export const footerData = {
  links: [],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'GitHub', icon: 'tabler:brand-github', href: 'https://github.com/Djaygo' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
  ],
  footNote: `
    <span class="text-sm text-muted">Djaygo's Digital Garden</span>
  `,
};
