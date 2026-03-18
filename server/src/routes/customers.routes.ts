import { Router } from 'express';
import { CustomersController } from '../controllers/customers.controller';

const router = Router();

router.get('/', CustomersController.getCustomers);
router.get('/:id', CustomersController.getCustomerDetails);
router.post('/:id/tags', CustomersController.updateTags);

export default router;
