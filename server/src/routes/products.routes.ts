import { Router } from 'express';
import { ProductsController } from '../controllers/products.controller';

const router = Router();

router.get('/', ProductsController.getProducts);
router.get('/summary', ProductsController.getProductsSummary);
router.get('/collections', ProductsController.getCollections);
router.post('/bulk-inventory', ProductsController.bulkUpdateInventory);
router.get('/:id', ProductsController.getProductDetails);
router.post('/:id/inventory', ProductsController.updateInventory);

export default router;

