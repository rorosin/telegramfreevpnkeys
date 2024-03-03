# Бот для каналов с бесплатными VPN ключами

## Установка
- Скачайте файлы проекта - `git clone https://github.com/rorosin/telegramfreevpnkeys.git && cd telegramfreevpnkeys`
- Переименуйте `.env.example` в `.env`
- Создайте бота в [BotFather](https://t.me/botfather/) и вставьте токен в `.env`
- [Установите](https://nodejs.org/en/download) NodeJS и NPM, если у вас их нет
- Установите зависимости с помощью `npm i`
- Переименуйте `config.jsonc.example` в `config.jsonc` и настройте бота в этом файле
- Получите `apiUrl` и `certSha256` из `/opt/outline/access.txt` на каждом вашем сервере и вставьте их в секцию `env` файла `config.jsonc`
- Запустите проект - `npm run start`