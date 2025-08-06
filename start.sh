npm install -f
pm2 startup systemd
pm2 start app.js --name "VEGANRESTAURANT"
pm2 save
pm2 monit