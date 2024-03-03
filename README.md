# Бот для каналов с бесплатными VPN ключами

## Установка
- Переименуйте `.env.example` в `.env`
- Получите `apiUrl` и `certSha256` из `/opt/outline/access.txt` на вашем сервере и вставьте их в `.env`
- Создайте бота в [BotFather](https://t.me/botfather/) и вставьте токен в `.env`
- [Установите](https://nodejs.org/en/download) NodeJS и NPM, если у вас их нет
- Установите зависимости с помощью `npm i`
- Запустите проект - `npm run start`