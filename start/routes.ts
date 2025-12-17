import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth-controller')
const KycController = () => import('#controllers/kyc-controller')
const WalletController = () => import('#controllers/wallet-controller')
const CardController = () => import('#controllers/card-controller')
const DevController = () => import('#controllers/dev-controller')
const SubscriptionController = () => import('#controllers/subscription-controller')

router.get('/', async ({ view }) => view.render('pages/landing')).as('home')

router
  .group(() => {
    router.get('/signup', [AuthController, 'showSignup']).as('auth.signup.show')
    router.post('/signup', [AuthController, 'signup']).as('auth.signup')
    router.get('/login', [AuthController, 'showLogin']).as('auth.login.show')
    router.post('/login', [AuthController, 'login']).as('auth.login')
    router.on('/forgot-password').render('pages/auth/forgot-password').as('auth.forgot')
    router.on('/verify-otp').render('pages/auth/otp-verification').as('auth.otp')
  })
  .use(middleware.guest())

router.post('/logout', [AuthController, 'logout']).as('auth.logout').use(middleware.auth())

router
  .group(() => {
    router.get('/dashboard', [CardController, 'index']).as('dashboard')
    router.get('/kyc/verify', [KycController, 'show']).as('kyc.show')
    router.post('/kyc/verify', [KycController, 'verify']).as('kyc.verify')
    router.get('/fund-wallet', [WalletController, 'show']).as('wallet.fund')
    router
      .post('/wallet/create-account', [WalletController, 'createVirtualAccount'])
      .as('wallet.create-account')
    router.get('/transactions', [WalletController, 'transactions']).as('transactions')

    router.get('/cards/create', [CardController, 'showCreate']).as('cards.create.show')
    router.post('/cards/create', [CardController, 'create']).as('cards.create')
    router.get('/cards/:id', [CardController, 'show']).as('cards.show')
    router.post('/cards/:id/freeze', [CardController, 'freeze']).as('cards.freeze')
    router.post('/cards/:id/unfreeze', [CardController, 'unfreeze']).as('cards.unfreeze')
    router.post('/cards/:id/delete', [CardController, 'delete']).as('cards.delete')

    // Subscriptions
    router.get('/subscriptions', [SubscriptionController, 'index']).as('subscriptions.index')
    router
      .get('/subscriptions/service/:id', [SubscriptionController, 'show'])
      .as('subscriptions.show')
    router
      .post('/subscriptions/service/:id/subscribe', [SubscriptionController, 'subscribe'])
      .as('subscriptions.subscribe')
    router
      .get('/subscriptions/:id/details', [SubscriptionController, 'details'])
      .as('subscriptions.details')
    router
      .post('/subscriptions/:id/activate', [SubscriptionController, 'markActive'])
      .as('subscriptions.activate')
    router
      .post('/subscriptions/:id/cancel', [SubscriptionController, 'cancel'])
      .as('subscriptions.cancel')

    // Dev/test routes (only work in development)
    router
      .post('/dev/simulate-funding', [DevController, 'simulateFunding'])
      .as('dev.simulate-funding')
  })
  .use(middleware.auth())

router.post('/webhooks/paystack', [WalletController, 'webhook']).as('webhooks.paystack')
