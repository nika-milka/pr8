// DOM элементы
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const notifyBtn = document.getElementById('notifyBtn');
const installBtn = document.getElementById('installBtn');

// Состояние приложения
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

// Инициализация приложения
function init() {
    renderTodos();
    setupEventListeners();
    checkNotificationPermission();
    registerServiceWorker();
    setupInstallPrompt();
    setupNotificationInterval();
}

// Регистрация Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }
}

// Установка обработчиков событий
function setupEventListeners() {
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
    
    notifyBtn.addEventListener('click', requestNotificationPermission);
}

// Обработка установки PWA
function setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });
    
    installBtn.addEventListener('click', () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                installBtn.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        installBtn.classList.add('hidden');
    });
}

// Добавление новой задачи
function addTodo() {
    const text = todoInput.value.trim();
    if (text === '') return;
    
    const newTodo = {
        id: Date.now(),
        text,
        completed: false
    };
    
    todos.unshift(newTodo);
    saveTodos();
    renderTodos();
    todoInput.value = '';
    
    // Показываем уведомление
    if (Notification.permission === 'granted') {
        showNotification('Новая задача добавлена', `Задача: ${text}`);
    }
}

// Сохранение задач в localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Отображение задач с учетом фильтра
function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true;
    });
    
    if (filteredTodos.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = getEmptyMessage();
        emptyMessage.classList.add('empty-message');
        todoList.appendChild(emptyMessage);
        return;
    }
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = todo.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodoComplete(todo.id));
        
        const span = document.createElement('span');
        span.className = 'todo-text' + (todo.completed ? ' completed' : '');
        span.textContent = todo.text;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        });
        
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        todoList.appendChild(li);
    });
}

// Получение сообщения для пустого списка
function getEmptyMessage() {
    switch (currentFilter) {
        case 'active': return 'Нет активных задач';
        case 'completed': return 'Нет выполненных задач';
        default: return 'Нет задач. Добавьте новую!';
    }
}

// Переключение статуса задачи
function toggleTodoComplete(id) {
    todos = todos.map(todo => 
        todo.id === id ? {...todo, completed: !todo.completed} : todo
    );
    saveTodos();
    renderTodos();
}

// Удаление задачи
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

// Работа с уведомлениями
function checkNotificationPermission() {
    if (Notification.permission === 'granted') {
        notifyBtn.textContent = 'Уведомления включены';
        notifyBtn.disabled = true;
    } else if (Notification.permission === 'denied') {
        notifyBtn.textContent = 'Уведомления заблокированы';
        notifyBtn.disabled = true;
    }
}

function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            notifyBtn.textContent = 'Уведомления включены';
            notifyBtn.disabled = true;
            
            // Регистрируем push-уведомления
            registerPushNotifications();
        } else {
            notifyBtn.textContent = 'Уведомления отключены';
        }
    });
}

function showNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    const options = {
        body,
        icon: 'icons/icon-188x188.png',
        badge: 'icons/icon-72x72.png'
    };
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
        });
    } else {
        new Notification(title, options);
    }
}

function registerPushNotifications() {
    if (!('PushManager' in window)) return;
    
    navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BLY8Y4Xy0lXH5q8z3n7k9Q1wT2u6p9o0i1v3e5r7t9y2u4i6o8p0a1s3d5f7g9h2j4k6l8m0n1b3v5c7x9z0')
        })
        .then(subscription => {
            console.log('Push subscription successful:', subscription);
        })
        .catch(err => {
            console.log('Push subscription failed:', err);
        });
    });
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}

// Напоминание о невыполненных задачах
function setupNotificationInterval() {
    // Проверяем каждые 2 часа
    setInterval(() => {
        if (Notification.permission !== 'granted') return;
        
        const activeTodos = todos.filter(todo => !todo.completed);
        if (activeTodos.length > 0) {
            showNotification(
                'Незавершенные задачи', 
                `У вас ${activeTodos.length} незавершенных задач. Не забудьте их выполнить!`
            );
        }
    }, 2 * 60 * 60 * 1000); // 2 часа
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);