const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const partRoutes = require('./routes/partRoutes');
const reportRoutes = require('./routes/reportRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const { attachCurrentUser, requireAuth } = require('./middlewares/authMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'oficina-motos-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(attachCurrentUser);

app.use('/css', express.static(path.join(publicDir, 'css')));
app.use('/js', express.static(path.join(publicDir, 'js')));
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/vendor', express.static(path.join(__dirname, '..', 'node_modules', 'jspdf', 'dist')));

app.get(['/', '/index.html'], (req, res) => {
  if (req.currentUser) {
    const destination = req.currentUser.role === 'supplier' ? '/supplier' : '/dashboard';
    return res.redirect(destination);
  }

  return res.redirect('/login');
});

app.get(['/login', '/login.html'], (req, res) => {
  if (req.currentUser) {
    const destination = req.currentUser.role === 'supplier' ? '/supplier' : '/dashboard';
    return res.redirect(destination);
  }

  return res.sendFile(path.join(publicDir, 'login.html'));
});

app.get(['/dashboard', '/dashboard.html'], requireAuth, (req, res) =>
  res.sendFile(path.join(publicDir, 'dashboard.html'))
);
app.get(['/requests', '/requests.html'], requireAuth, (req, res) =>
  res.sendFile(path.join(publicDir, 'requests.html'))
);
app.get(['/appointments', '/appointments.html'], requireAuth, (req, res) =>
  res.sendFile(path.join(publicDir, 'appointments.html'))
);
app.get(['/supplier', '/supplier.html'], requireAuth, (req, res) =>
  res.sendFile(path.join(publicDir, 'supplier.html'))
);
app.get(['/report', '/report.html'], requireAuth, (req, res) =>
  res.sendFile(path.join(publicDir, 'report.html'))
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
