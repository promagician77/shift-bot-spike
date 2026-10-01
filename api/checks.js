import { runChecks } from '../scripts/checks.mjs';
export default async function handler(req, res) {
  try {
    const out = await runChecks();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
