const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const categoriaController = require("../controllers/categoriaController");

router.use(authenticateToken);

router.get("/", categoriaController.listarCategorias);
router.post("/", categoriaController.criarCategoria);
router.put("/:id", categoriaController.editarCategoria);
router.delete("/:id", categoriaController.deletarCategoria);

module.exports = router;
