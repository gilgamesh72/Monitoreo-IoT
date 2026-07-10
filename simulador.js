require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// Cargar credenciales desde variables de entorno
const token = process.env.INFLUX_TOKEN;
const url = process.env.INFLUX_URL;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

const client = new InfluxDB({ url, token });
const writeClient = client.getWriteApi(org, bucket, 'ns', {
  writeOptions: {
    batchSize: 1, // Envía el dato de inmediato, sin acumular
    flushInterval: 1000 // Si no se llena, envía cada 1 segundo máximo
  }
});
console.log("🚀 Simulador de sensores activado para la presentación...");

// 2. Bucle para enviar datos cada 3 segundos
setInterval(() => {

  // Simulamos datos realistas que suben y bajan levemente
  const co2 = 400 + (Math.random() * 50);                  // Double (ej. 415.23)
  const humedad = 60 + (Math.random() - 0.5) * 5;          // Double (ej. 58.4)
  const humedad_suelo = Math.floor(300 + Math.random() * 100); // Long / Integer (ej. 345)
  const luz = Math.floor(500 + Math.random() * 200);           // Long / Integer (ej. 612)
  const temperatura = 24 + (Math.random() - 0.5) * 2;      // Double (ej. 23.8)

  // 3. Estructuramos el punto de datos
  // 'lectura_sensores' actuará como el nombre de tu tabla
  const punto = new Point('lectura_sensores')
    .tag('dispositivo', 'modulo_principal') // Un tag para identificar de dónde viene
    .floatField('co2_ppm', co2)
    .floatField('humedad', humedad)
    .intField('humedad_suelo', humedad_suelo)
    .intField('luz', luz)
    .floatField('temperatura', temperatura);
  // El campo 'time' (dateTime:RFC339) InfluxDB lo genera SOLITO en la nube
  // asignándole la hora exacta actual en nanosegundos en cuanto recibe el punto.

  // 4. Enviamos a la nube
  writeClient.writePoint(punto);
  console.log(`[Enviado] CO2: ${co2.toFixed(1)} | Temp: ${temperatura.toFixed(1)}°C | Luz: ${luz}`);

}, 2000); // Ejecutar cada 3 segundos

// Asegurar que guarde todo antes de cerrar si detienes el script
process.on('SIGINT', () => {
  writeClient.flush().then(() => { process.exit(); });
});