const { todayISO } = require("../utils/contasFixas");
const {
  getPrivacySummary,
  exportUserDataBundle,
  deleteOwnAccount,
} = require("../services/privacidadeService");

exports.obterResumo = async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const resumo = await getPrivacySummary(req.user.userId);
    res.json(resumo);
  } catch (err) {
    next(err);
  }
};

exports.exportarDados = async (req, res, next) => {
  try {
    const bundle = await exportUserDataBundle(req.user.userId);
    const filename = `mefinance-dados-conta-${todayISO()}.json`;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    next(err);
  }
};

exports.excluirConta = async (req, res, next) => {
  try {
    const { password, confirmUsername, confirmPhrase } = req.body || {};
    const result = await deleteOwnAccount(req.user.userId, {
      password,
      confirmUsername,
      confirmPhrase,
    });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json({ message: "Sua conta e todos os seus dados foram removidos permanentemente." });
  } catch (err) {
    next(err);
  }
};
