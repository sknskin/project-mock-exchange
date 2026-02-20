/**
 * @file 국제화 (i18n)
 * @description 한국어/영어 번역 키와 번역 함수를 정의합니다
 *
 * @file Internationalization (i18n)
 * @description Defines Korean/English translation keys and translation function
 */
export type Locale = 'ko' | 'en';

const translations = {
  ko: {
    // Header
    'nav.home': '홈',
    'nav.dashboard': '대시보드',
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
    'market.mockData': '가상 데이터',
    'market.mockDataDesc': '본 서비스의 모든 시세·거래 데이터는 시뮬레이션으로 생성된 가상 데이터이며, 실제 시장과 무관합니다.',
    'market.liveData': '실시간',
    'market.simulatedData': '시뮬레이션',
    'market.exchangeRate': '환율',
    'market.marketIndex': '시장 지수',
    'market.top5Turnover': '거래대금\nTop 5',
    'market.dataSourceDesc': '암호화폐 시세는 Binance 실시간 데이터, 주식 시세는 시뮬레이션 데이터입니다.',

    // Filters
    'filter.all': '전체',
    'filter.crypto': '암호화폐',
    'filter.stock': '주식',
    'filter.stockKR': '국내주식',
    'filter.stockUS': '해외주식',
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

    // Error
    'error.title': '서비스 오류',
    'error.description': '서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'error.persistent': '지속적으로 오류가 발생하는 경우 관리자에게 연락해주세요.',
    'error.retry': '다시 시도',
    'error.goHome': '홈으로',
    'error.connectionFailed': '서버 연결 실패',
    'error.connectionDesc': '서버에 연결할 수 없습니다. 서비스가 점검 중이거나 네트워크 상태를 확인해주세요.',

    // Toast
    'toast.copied': '복사됨!',

    // ScrollTop
    'scrollTop': '맨 위로',

    // Modal
    'modal.close': '닫기',

    // Landing Page
    'landing.title': 'VirtuEx',
    'landing.subtitle': '실시간 모의 주식/암호화폐 거래 플랫폼',
    'landing.description': '마이크로서비스 아키텍처 기반의 프로덕션급 모의 거래 시스템입니다. 실시간 시세, 주문 매칭 엔진, 포트폴리오 관리를 경험해보세요.',
    'landing.cta': '대시보드로 이동',
    'landing.techStack': '기술 스택',
    'landing.overview': '프로젝트 개요',
    'landing.overviewDesc': '이벤트 소싱, CQRS, Saga 패턴을 적용한 8개 마이크로서비스 기반 모의 거래 플랫폼',
    'landing.docs': '관련 문서',
    'landing.docsDesc': '프로젝트를 이해하고 로컬에서 실행하기 위한 가이드와 API 문서',
    'landing.localRun': '로컬 실행 가이드',
    'landing.localRunDesc': 'Docker + pnpm 기반 로컬 환경 구축 및 실행 방법',
    'landing.projectSpec': '프로젝트 기획서',
    'landing.projectSpecDesc': '아키텍처, 이벤트 흐름, CQRS, Saga 등 전체 설계 문서',
    'landing.swaggerDocs': 'API 문서',
    'landing.swaggerDocsDesc': 'Swagger UI로 확인하는 전체 REST API 명세',
    'landing.features.microservice': '마이크로서비스',
    'landing.features.microserviceDesc': '8개 독립 서비스, Database per Service 패턴',
    'landing.features.websocket': '실시간 WebSocket',
    'landing.features.websocketDesc': 'Socket.IO + Redis PubSub 기반 실시간 시세 스트리밍',
    'landing.features.kafka': 'Kafka 이벤트 버스',
    'landing.features.kafkaDesc': '이벤트 소싱 + Outbox 패턴으로 서비스 간 비동기 통신',
    'landing.features.matching': '주문 매칭 엔진',
    'landing.features.matchingDesc': 'CQRS + Saga 패턴 기반 시장가/지정가 주문 매칭',

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
    'nav.dashboard': 'Dashboard',
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
    'market.mockData': 'Simulated Data',
    'market.mockDataDesc': 'All prices and trades on this platform are simulated and not related to real markets.',
    'market.liveData': 'Live',
    'market.simulatedData': 'Simulated',
    'market.exchangeRate': 'Exchange Rate',
    'market.marketIndex': 'Market Index',
    'market.top5Turnover': 'Turnover\nTop 5',
    'market.dataSourceDesc': 'Crypto prices are live from Binance. Stock prices are simulated.',

    // Filters
    'filter.all': 'All',
    'filter.crypto': 'Crypto',
    'filter.stock': 'Stocks',
    'filter.stockKR': 'KR Stocks',
    'filter.stockUS': 'US Stocks',
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

    // Error
    'error.title': 'Service Error',
    'error.description': 'A temporary issue occurred. Please try again shortly.',
    'error.persistent': 'If the issue persists, please contact the administrator.',
    'error.retry': 'Retry',
    'error.goHome': 'Home',
    'error.connectionFailed': 'Connection Failed',
    'error.connectionDesc': 'Unable to connect to the server. The service may be under maintenance or please check your network.',

    // Toast
    'toast.copied': 'Copied!',

    // ScrollTop
    'scrollTop': 'Back to top',

    // Modal
    'modal.close': 'Close',

    // Landing Page
    'landing.title': 'VirtuEx',
    'landing.subtitle': 'Real-time Mock Stock & Crypto Trading Platform',
    'landing.description': 'A production-grade mock trading system built on microservices architecture. Experience real-time quotes, order matching engine, and portfolio management.',
    'landing.cta': 'Go to Dashboard',
    'landing.techStack': 'Tech Stack',
    'landing.overview': 'Project Overview',
    'landing.overviewDesc': 'A mock trading platform powered by 8 microservices with Event Sourcing, CQRS, and Saga patterns',
    'landing.docs': 'Documentation',
    'landing.docsDesc': 'Guides and API docs to understand and run the project locally',
    'landing.localRun': 'Local Run Guide',
    'landing.localRunDesc': 'How to set up and run services locally with Docker + pnpm',
    'landing.projectSpec': 'Project Spec',
    'landing.projectSpecDesc': 'Full architecture design: event flows, CQRS, Saga, and more',
    'landing.swaggerDocs': 'API Docs',
    'landing.swaggerDocsDesc': 'Browse all REST API endpoints via Swagger UI',
    'landing.features.microservice': 'Microservices',
    'landing.features.microserviceDesc': '8 independent services with Database per Service pattern',
    'landing.features.websocket': 'Real-time WebSocket',
    'landing.features.websocketDesc': 'Live price streaming via Socket.IO + Redis PubSub',
    'landing.features.kafka': 'Kafka Event Bus',
    'landing.features.kafkaDesc': 'Async inter-service communication with Event Sourcing + Outbox pattern',
    'landing.features.matching': 'Order Matching Engine',
    'landing.features.matchingDesc': 'Market/limit order matching with CQRS + Saga pattern',

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
