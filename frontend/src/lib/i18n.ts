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
    'footer.rights': '© 2026 VirtuEx. 교육 목적으로 제작되었습니다.',

    // Toast
    'toast.copied': '복사됨!',

    // ScrollTop
    'scrollTop': '맨 위로',

    // Auth - Login
    'auth.login.title': '로그인',
    'auth.login.subtitle': 'VirtuEx 모의투자에 오신 걸 환영합니다',
    'auth.login.identifier': '이메일 또는 아이디',
    'auth.login.password': '비밀번호',
    'auth.login.submit': '로그인',
    'auth.login.loading': '로그인 중...',
    'auth.login.error': '이메일/아이디 또는 비밀번호가 올바르지 않습니다.',
    'auth.login.noAccount': '계정이 없으신가요?',
    'auth.login.register': '회원가입',

    // Auth - Register
    'auth.register.title': '회원가입',
    'auth.register.subtitle': '모의투자를 시작해보세요',
    'auth.register.username': '아이디',
    'auth.register.usernamePlaceholder': '영문, 숫자, 밑줄 3~50자',
    'auth.register.email': '이메일',
    'auth.register.emailPlaceholder': 'example@email.com',
    'auth.register.password': '비밀번호',
    'auth.register.passwordPlaceholder': '8자 이상',
    'auth.register.passwordConfirm': '비밀번호 확인',
    'auth.register.passwordConfirmPlaceholder': '비밀번호를 다시 입력하세요',
    'auth.register.name': '성명',
    'auth.register.namePlaceholder': '실명을 입력하세요',
    'auth.register.phone': '전화번호',
    'auth.register.phonePlaceholder': '01012345678',
    'auth.register.residentNumber': '주민등록번호',
    'auth.register.residentFront': '앞 6자리',
    'auth.register.residentBack': '뒷 7자리',
    'auth.register.address': '주소',
    'auth.register.addressSearch': '주소 검색',
    'auth.register.addressDetail': '상세주소',
    'auth.register.addressDetailPlaceholder': '상세주소를 입력하세요',
    'auth.register.zipCode': '우편번호',
    'auth.register.submit': '가입하기',
    'auth.register.loading': '가입 중...',
    'auth.register.error': '회원가입에 실패했습니다. 다시 시도해주세요.',
    'auth.register.hasAccount': '이미 계정이 있으신가요?',
    'auth.register.login': '로그인',

    // Validation
    'validation.required': '필수 입력 항목입니다',
    'validation.username.format': '영문, 숫자, 밑줄만 사용 가능합니다',
    'validation.username.length': '3~50자로 입력해주세요',
    'validation.email.format': '올바른 이메일 형식이 아닙니다',
    'validation.password.minLength': '8자 이상이어야 합니다',
    'validation.password.uppercase': '대문자를 포함해야 합니다',
    'validation.password.lowercase': '소문자를 포함해야 합니다',
    'validation.password.number': '숫자를 포함해야 합니다',
    'validation.password.special': '특수문자를 포함해야 합니다',
    'validation.passwordConfirm.match': '비밀번호가 일치하지 않습니다',
    'validation.passwordConfirm.ok': '비밀번호가 일치합니다',
    'validation.phone.format': '올바른 전화번호 형식이 아닙니다',
    'validation.phone.verified': '인증 완료',
    'validation.phone.notVerified': '전화번호 인증이 필요합니다',
    'validation.residentNumber.format': '올바른 주민등록번호 형식이 아닙니다',
    'validation.duplicate.checking': '확인 중...',
    'validation.duplicate.available': '사용 가능합니다',
    'validation.duplicate.taken': '이미 사용 중입니다',

    // SMS Verification
    'sms.send': '인증요청',
    'sms.resend': '재전송',
    'sms.verify': '인증확인',
    'sms.codePlaceholder': '인증번호 6자리',
    'sms.sent': '인증번호가 발송되었습니다',
    'sms.verified': '인증이 완료되었습니다',
    'sms.invalidCode': '인증번호가 올바르지 않습니다',
    'sms.expired': '인증번호가 만료되었습니다. 재전송해주세요',
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
    'footer.rights': '© 2026 VirtuEx. Built for educational purposes.',

    // Toast
    'toast.copied': 'Copied!',

    // ScrollTop
    'scrollTop': 'Back to top',

    // Auth - Login
    'auth.login.title': 'Login',
    'auth.login.subtitle': 'Welcome to VirtuEx Mock Trading',
    'auth.login.identifier': 'Email or Username',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Login',
    'auth.login.loading': 'Logging in...',
    'auth.login.error': 'Invalid email/username or password.',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.register': 'Sign Up',

    // Auth - Register
    'auth.register.title': 'Sign Up',
    'auth.register.subtitle': 'Start mock trading today',
    'auth.register.username': 'Username',
    'auth.register.usernamePlaceholder': 'Letters, numbers, underscore 3-50',
    'auth.register.email': 'Email',
    'auth.register.emailPlaceholder': 'example@email.com',
    'auth.register.password': 'Password',
    'auth.register.passwordPlaceholder': 'At least 8 characters',
    'auth.register.passwordConfirm': 'Confirm Password',
    'auth.register.passwordConfirmPlaceholder': 'Re-enter your password',
    'auth.register.name': 'Full Name',
    'auth.register.namePlaceholder': 'Enter your real name',
    'auth.register.phone': 'Phone Number',
    'auth.register.phonePlaceholder': '01012345678',
    'auth.register.residentNumber': 'Resident Registration Number',
    'auth.register.residentFront': 'First 6 digits',
    'auth.register.residentBack': 'Last 7 digits',
    'auth.register.address': 'Address',
    'auth.register.addressSearch': 'Search Address',
    'auth.register.addressDetail': 'Detail Address',
    'auth.register.addressDetailPlaceholder': 'Enter detail address',
    'auth.register.zipCode': 'Zip Code',
    'auth.register.submit': 'Sign Up',
    'auth.register.loading': 'Signing up...',
    'auth.register.error': 'Registration failed. Please try again.',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.login': 'Login',

    // Validation
    'validation.required': 'This field is required',
    'validation.username.format': 'Only letters, numbers, and underscores allowed',
    'validation.username.length': 'Must be 3-50 characters',
    'validation.email.format': 'Invalid email format',
    'validation.password.minLength': 'Must be at least 8 characters',
    'validation.password.uppercase': 'Must contain an uppercase letter',
    'validation.password.lowercase': 'Must contain a lowercase letter',
    'validation.password.number': 'Must contain a number',
    'validation.password.special': 'Must contain a special character',
    'validation.passwordConfirm.match': 'Passwords do not match',
    'validation.passwordConfirm.ok': 'Passwords match',
    'validation.phone.format': 'Invalid phone number format',
    'validation.phone.verified': 'Verified',
    'validation.phone.notVerified': 'Phone verification required',
    'validation.residentNumber.format': 'Invalid resident registration number',
    'validation.duplicate.checking': 'Checking...',
    'validation.duplicate.available': 'Available',
    'validation.duplicate.taken': 'Already in use',

    // SMS Verification
    'sms.send': 'Send Code',
    'sms.resend': 'Resend',
    'sms.verify': 'Verify',
    'sms.codePlaceholder': '6-digit code',
    'sms.sent': 'Verification code sent',
    'sms.verified': 'Verification complete',
    'sms.invalidCode': 'Invalid verification code',
    'sms.expired': 'Code expired. Please resend',
  },
} as const;

export type TranslationKey = keyof typeof translations.ko;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[locale][key] ?? key;
}
