# Архитектура Корпоративного Портала

## 1. Стек технологий

*   **Frontend**: React (SPA) + TypeScript. Стейт-менеджмент через Context API или Zustand.
*   **Backend**: Node.js (NestJS) для строгой типизации и модульности.
*   **Database**: PostgreSQL 15+.
*   **Storage**: S3-compatible (MinIO для on-premise или AWS S3).
*   **Auth**: JWT (Access + Refresh tokens).

## 2. Безопасность данных

### Аутентификация и Авторизация
*   **Пароли**: Хеширование с использованием `Argon2` или `bcrypt` с солью.
*   **JWT**:
    *   `Access Token`: Короткое время жизни (15-30 мин). Хранится в памяти (JS variable) или Secure Cookie.
    *   `Refresh Token`: Длительное время жизни (7-30 дней). Хранится в `HttpOnly Secure Cookie`. Защита от XSS.
*   **RBAC (Role-Based Access Control)**:
    *   Middleware на бэкенде проверяет `user.role` перед доступом к эндпоинтам.
    *   Пример: `DELETE /api/users/:id` доступен только для роли `ADMIN`.

### Защита БД
*   **SQL Injection**: Использование ORM (Prisma/TypeORM) или параметризованных запросов.
*   **Least Privilege**: Бэкенд подключается к БД от имени пользователя с правами только на DML (SELECT, INSERT, UPDATE, DELETE), но не DDL (DROP TABLE).

## 3. Масштабирование

### База данных
1.  **Read Replicas**: При росте нагрузки на чтение (много сотрудников читают новости/базу знаний), создаем реплики для SELECT-запросов.
2.  **Partitioning**: Таблицу `employee_updates` (лента) и `tasks` можно партиционировать по дате (например, по годам), так как старые записи запрашиваются редко.

### Backend
*   **Stateless**: Сервер не хранит сессии. JWT позволяет горизонтально масштабировать API (поднимать несколько инстансов Node.js за Load Balancer'ом, например Nginx).

### Файлы
*   Файлы не хранятся в БД. В таблице `documents` хранится только ссылка (`storage_path`). Сами файлы лежат в объектном хранилище (S3), что позволяет хранить терабайты данных без нагрузки на БД.

## 4. API Structure (RESTful)

*   `POST /auth/login` - Вход
*   `POST /auth/refresh` - Обновление токена
*   `GET /users` - Список сотрудников (с пагинацией)
*   `GET /articles?type=knowledge` - Поиск по базе знаний
*   `POST /documents/upload` - Загрузка файла (Multipart)

## 5. Рекомендации по UX (из Frontend части)
*   Использовать `Optimistic UI` для задач (мгновенное перемещение карточки до ответа сервера).
*   Кеширование статических данных (справочник сотрудников) на клиенте (React Query / SWR).
