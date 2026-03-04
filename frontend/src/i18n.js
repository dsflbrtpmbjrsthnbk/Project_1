import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Nav
      signIn: 'Sign in',
      signOut: 'Sign out',
      myProfile: 'My Profile',
      adminPanel: 'Admin Panel',
      search: 'Search inventories and items...',
      // Home
      latest: 'Latest',
      popular: 'Popular',
      tagCloud: 'Tag Cloud',
      seeAll: 'See all',
      newInventory: 'New Inventory',
      manageCollections: 'Manage your collections,',
      beautifully: 'beautifully.',
      heroSubtitle: 'Create inventories, define custom fields, and track everything.',
      // Inventory
      items: 'Items',
      discussion: 'Discussion',
      settings: 'Settings',
      customId: 'Custom ID',
      fields: 'Fields',
      access: 'Access',
      statistics: 'Statistics',
      export: 'Export',
      addItem: 'Add Item',
      deleteInventory: 'Delete this inventory?',
      public: 'Public',
      private: 'Private',
      allChangesSaved: 'All changes saved',
      saving: 'Saving...',
      // Items table
      noItems: 'No items yet. Add the first one!',
      customIdCol: 'ID',
      createdAt: 'Created',
      actions: 'Actions',
      editItem: 'Edit',
      deleteItem: 'Delete',
      // Item page
      writeDomment: 'Write a comment...',
      noComments: 'No comments yet. Be the first!',
      comments: 'comments',
      // Admin
      adminTitle: 'Admin Panel',
      userManagement: 'User management',
      searchUsers: 'Search users...',
      user: 'User',
      email: 'Email',
      roles: 'Roles',
      inventories: 'Inventories',
      joined: 'Joined',
      status: 'Status',
      actionsCol: 'Actions',
      blocked: 'Blocked',
      active: 'Active',
      // Profile
      myInventories: 'My Inventories',
      ownedInventories: 'Owned Inventories',
      writeAccessInventories: 'Inventories with write access',
      sortBy: 'Sort by...',
      title: 'Title',
      date: 'Date',
      // General
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      language: 'Language',
      theme: 'Theme',
      lightMode: 'Light',
      darkMode: 'Dark',
      loading: 'Loading...',
      notFound: 'Not found',
    }
  },
  ru: {
    translation: {
      // Nav
      signIn: 'Войти',
      signOut: 'Выйти',
      myProfile: 'Мой профиль',
      adminPanel: 'Панель администратора',
      search: 'Поиск инвентарей и элементов...',
      // Home
      latest: 'Последние',
      popular: 'Популярные',
      tagCloud: 'Облако тегов',
      seeAll: 'Все',
      newInventory: 'Новый инвентарь',
      manageCollections: 'Управляйте коллекциями,',
      beautifully: 'красиво.',
      heroSubtitle: 'Создавайте инвентари, определяйте поля и отслеживайте всё.',
      // Inventory
      items: 'Элементы',
      discussion: 'Обсуждение',
      settings: 'Настройки',
      customId: 'Пользов. ID',
      fields: 'Поля',
      access: 'Доступ',
      statistics: 'Статистика',
      export: 'Экспорт',
      addItem: 'Добавить',
      deleteInventory: 'Удалить этот инвентарь?',
      public: 'Публичный',
      private: 'Приватный',
      allChangesSaved: 'Все изменения сохранены',
      saving: 'Сохранение...',
      // Items table
      noItems: 'Нет элементов. Добавьте первый!',
      customIdCol: 'ID',
      createdAt: 'Создан',
      actions: 'Действия',
      editItem: 'Изменить',
      deleteItem: 'Удалить',
      // Item page
      writeDomment: 'Написать комментарий...',
      noComments: 'Нет комментариев. Будьте первым!',
      comments: 'комментариев',
      // Admin
      adminTitle: 'Панель администратора',
      userManagement: 'Управление пользователями',
      searchUsers: 'Поиск пользователей...',
      user: 'Пользователь',
      email: 'Email',
      roles: 'Роли',
      inventories: 'Инвентари',
      joined: 'Дата',
      status: 'Статус',
      actionsCol: 'Действия',
      blocked: 'Заблокирован',
      active: 'Активен',
      // Profile
      myInventories: 'Мои инвентари',
      ownedInventories: 'Созданные инвентари',
      writeAccessInventories: 'Инвентари с правом записи',
      sortBy: 'Сортировка...',
      title: 'Название',
      date: 'Дата',
      // General
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Изменить',
      add: 'Добавить',
      language: 'Язык',
      theme: 'Тема',
      lightMode: 'Светлая',
      darkMode: 'Тёмная',
      loading: 'Загрузка...',
      notFound: 'Не найдено',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
