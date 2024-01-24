import express from 'express';
import axios from 'axios';

const app = express();
const port = 3000;

app.get('/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records', async (req, res) => {
  try {
    const response = await axios.get('https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips_ecoles_v2/records');
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while trying to fetch data');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
});