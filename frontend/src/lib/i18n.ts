export type Locale = 'ko' | 'en';

const translations = {
  ko: {
    // Header
    'nav.home': '홈',
    'nav.portfolio': '내 투자',
    'nav.orders': '주문내역',
    'nav.leaderboard': '리더보드',
    'nav.more': '더보기',
    'nav.search': '를 눌러 검색하세요',
    'nav.login': '로그인',
    'nav.logout': '로그아웃',
    'nav.menu': '메뉴',

    // Market
    'market.unit': '원',
    'market.realtimeChart': '실시간 차트',
    'market.popular': '인기 종목',
    'market.trending': '투자자 동향',

    // Filters
    'filter.all': '전체',
    'filter.crypto': '암호화폐',
    'filter.stock': '주식',
    'filter.volume': '거래량순',
    'filter.riseTop': '급상승',
    'filter.fallTop': '급하락',
    'filter.amount': '거래대금순',
    'filter.realtime': '실시간',
    'filter.1d': '1일',
    'filter.1w': '1주',
    'filter.1m': '1개월',
    'filter.3m': '3개월',
    'filter.6m': '6개월',
    'filter.1y': '1년',

    // Table header
    'table.rank': '순위',
    'table.name': '종목명',
    'table.price': '현재가',
    'table.change': '전일대비',
    'table.changeRate': '등락률',
    'table.high24h': '24h 고가',
    'table.low24h': '24h 저가',
    'table.tradingVolume': '거래대금',
    'table.empty': '종목이 없습니다',
    'table.loadMore': '더 보기',

    // Settings
    'settings.title': '설정',
    'settings.darkMode': '다크 모드',
    'settings.lightMode': '라이트 모드',
    'settings.language': '언어',
    'settings.korean': '한국어',
    'settings.english': 'English',

    // Footer
    'footer.techStack': '기술 스택',
    'footer.description': '실시간 모의 주식/암호화폐 거래 플랫폼',
    'footer.rights': '© 2026 MockX. 교육 목적으로 제작되었습니다.',

    // ScrollTop
    'scrollTop': '맨 위로',
  },
  en: {
    // Header
    'nav.home': 'Home',
    'nav.portfolio': 'Portfolio',
    'nav.orders': 'Orders',
    'nav.leaderboard': 'Leaderboard',
    'nav.more': 'More',
    'nav.search': ' to search',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.menu': 'Menu',

    // Market
    'market.unit': '',
    'market.realtimeChart': 'Real-time',
    'market.popular': 'Popular',
    'market.trending': 'Trending',

    // Filters
    'filter.all': 'All',
    'filter.crypto': 'Crypto',
    'filter.stock': 'Stocks',
    'filter.volume': 'Volume',
    'filter.riseTop': 'Top Gainers',
    'filter.fallTop': 'Top Losers',
    'filter.amount': 'Turnover',
    'filter.realtime': 'Live',
    'filter.1d': '1D',
    'filter.1w': '1W',
    'filter.1m': '1M',
    'filter.3m': '3M',
    'filter.6m': '6M',
    'filter.1y': '1Y',

    // Table header
    'table.rank': '#',
    'table.name': 'Name',
    'table.price': 'Price',
    'table.change': 'Change',
    'table.changeRate': 'Change %',
    'table.high24h': '24h High',
    'table.low24h': '24h Low',
    'table.tradingVolume': 'Volume',
    'table.empty': 'No assets found',
    'table.loadMore': 'Load More',

    // Settings
    'settings.title': 'Settings',
    'settings.darkMode': 'Dark Mode',
    'settings.lightMode': 'Light Mode',
    'settings.language': 'Language',
    'settings.korean': '한국어',
    'settings.english': 'English',

    // Footer
    'footer.techStack': 'Tech Stack',
    'footer.description': 'Real-time mock stock & crypto trading platform',
    'footer.rights': '© 2026 MockX. Built for educational purposes.',

    // ScrollTop
    'scrollTop': 'Back to top',
  },
} as const;

export type TranslationKey = keyof typeof translations.ko;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[locale][key] ?? key;
}
