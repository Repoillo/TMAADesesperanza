-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: panaderia
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'Admin','User','hola@gmail.com'),(2,'Angel','User','angel@gmail.com'),(3,'pepe','casas','pepe@gmail.com');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_pedidos`
--

DROP TABLE IF EXISTS `detalle_pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_pedidos` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int NOT NULL,
  `id_producto` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `id_pedido` (`id_pedido`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `detalle_pedidos_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE,
  CONSTRAINT `detalle_pedidos_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_pedidos`
--

LOCK TABLES `detalle_pedidos` WRITE;
/*!40000 ALTER TABLE `detalle_pedidos` DISABLE KEYS */;
INSERT INTO `detalle_pedidos` VALUES (1,3,1,2,25.50),(2,3,3,1,30.00),(3,3,4,1,2.25),(4,4,3,1,30.00),(5,4,4,3,2.25),(6,5,2,1,25.00),(7,5,1,3,25.50),(8,6,5,2,20.00);
/*!40000 ALTER TABLE `detalle_pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas` (
  `id_factura` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int NOT NULL,
  `fecha_emision` datetime DEFAULT CURRENT_TIMESTAMP,
  `folio_fiscal` varchar(255) DEFAULT NULL,
  `datos_fiscales_cliente` json DEFAULT NULL,
  `total_facturado` decimal(10,2) NOT NULL,
  `estado_factura` enum('emitida','pagada','cancelada') NOT NULL DEFAULT 'emitida',
  PRIMARY KEY (`id_factura`),
  UNIQUE KEY `id_pedido` (`id_pedido`),
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredientes`
--

DROP TABLE IF EXISTS `ingredientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredientes` (
  `id_ingrediente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `unidad_medida` varchar(20) NOT NULL,
  `cantidad_stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_ingrediente`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredientes`
--

LOCK TABLES `ingredientes` WRITE;
/*!40000 ALTER TABLE `ingredientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingredientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int DEFAULT NULL,
  `fecha_pedido` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_pedido` decimal(10,2) NOT NULL,
  `estado_pedido` enum('pendiente','en_preparacion','listo_para_recoger','entregado','cancelado') NOT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `id_cliente` (`id_cliente`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (3,1,'2025-11-04 08:24:58',83.25,'pendiente'),(4,3,'2025-11-04 08:39:16',36.75,'pendiente'),(5,3,'2025-11-04 08:43:30',101.50,'pendiente'),(6,3,'2025-11-04 08:58:58',40.00,'pendiente');
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `es_de_temporada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'Croissant de Almendras',25.50,'https://ketology.mx/cdn/shop/files/croissant_1e388d23-aab1-4793-a0c9-670de31816ca.png?v=1726788469',0),(2,'PAN DE MUERTO ?????',25.00,'https://revistasociosams.com/wp-content/uploads/2021/08/pan-de-muerto-vista-arriba.png',1),(3,'Pan al vapor',30.00,'https://png.pngtree.com/png-clipart/20250501/original/pngtree-steamed-bun-cut-in-half-showing-filling-png-image_20924527.png',0),(4,'bolillo',2.25,'https://champlitte.com.mx/imgProd/s3XGYvl1R43550ae5ffd5f1d9aaf5ac145b14ef28%20(2).webp',0),(5,'vuala',20.00,'https://dulcerialaestrella.com.mx/cdn/shop/files/IMG25_0058_1200x.png?v=1761411589',0);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recetas`
--

DROP TABLE IF EXISTS `recetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recetas` (
  `id_producto` int NOT NULL,
  `id_ingrediente` int NOT NULL,
  `cantidad_necesaria` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_producto`,`id_ingrediente`),
  KEY `id_ingrediente` (`id_ingrediente`),
  CONSTRAINT `recetas_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE,
  CONSTRAINT `recetas_ibfk_2` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id_ingrediente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas`
--

LOCK TABLES `recetas` WRITE;
/*!40000 ALTER TABLE `recetas` DISABLE KEYS */;
/*!40000 ALTER TABLE `recetas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` bigint unsigned NOT NULL AUTO_INCREMENT,
  `correo` varchar(100) NOT NULL,
  `contraseña_hash` varchar(255) NOT NULL,
  `rol` enum('admin','cliente') NOT NULL DEFAULT 'cliente',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'hola@gmail.com','$2b$10$.WvcgcZXcrrVsNliBIR5MOUpd7LW9RoZXF/D.oS9Y85UczICAomWe','admin'),(2,'angel@gmail.com','$2b$10$6pKQZhkssk/woPyvP20VwuQte0PtmXUpajHSu8Cid84Kzw3.fEHgu','cliente'),(3,'pepe@gmail.com','$2b$10$tjr9JbIBkeunNr4UN6FhIeiZFZthUN8iUkBv4vWP/tPvH8S8vH0pG','cliente');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'panaderia'
--

--
-- Dumping routines for database 'panaderia'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-04 10:21:26
