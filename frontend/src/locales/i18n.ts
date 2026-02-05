import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import homeEn from './en/home.json';
import homeZh from './zh/home.json';
import cookieEn from './en/cookie.json';
import cookieZh from './zh/cookie.json';
import helpEn from './en/help.json';
import helpZh from './zh/help.json';
import contactEn from './en/contact.json';
import contactZh from './zh/contact.json';
import feedbackEn from './en/feedback.json';
import feedbackZh from './zh/feedback.json';
import privacyEn from './en/privacy.json';
import privacyZh from './zh/privacy.json';
import termsEn from './en/terms.json';
import termsZh from './zh/terms.json';
import aboutEn from './en/about.json';
import aboutZh from './zh/about.json';
import searchEn from './en/search.json';
import searchZh from './zh/search.json';
import registrationEn from './en/registration.json';
import registrationZh from './zh/registration.json';
import userEn from './en/user.json';
import userZh from './zh/user.json';
import teacherEn from './en/teacher.json';
import teacherZh from './zh/teacher.json';
import courseManagementEn from './en/courseManagement.json';
import courseManagementZh from './zh/courseManagement.json';
import reviewsEn from './en/reviews.json';
import reviewsZh from './zh/reviews.json';

// Resources object with nested structure
const resources = {
  en: {
    home: homeEn,
    cookie: cookieEn,
    help: helpEn,
    contact: contactEn,
    feedback: feedbackEn,
    privacy: privacyEn,
    terms: termsEn,
    about: aboutEn,
    search: searchEn,
    registration: registrationEn,
    user: userEn,
    teacher: teacherEn,
    courseManagement: courseManagementEn,
    reviews: reviewsEn,
  },
  zh: {
    home: homeZh,
    cookie: cookieZh,
    help: helpZh,
    contact: contactZh,
    feedback: feedbackZh,
    privacy: privacyZh,
    terms: termsZh,
    about: aboutZh,
    search: searchZh,
    registration: registrationZh,
    user: userZh,
    teacher: teacherZh,
    courseManagement: courseManagementZh,
    reviews: reviewsZh,
  },
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  defaultNS: 'home',
  ns: [
    'home',
    'search',
    'about',
    'contact',
    'cookie',
    'help',
    'feedback',
    'privacy',
    'terms',
    'registration',
    'user',
    'teacher',
    'courseManagement',
    'reviews',
  ],
});

export default i18n;
