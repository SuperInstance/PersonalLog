/**
 * Example 10: Real-World Integration
 *
 * Demonstrates a practical e-commerce customer service bot:
 * - Order lookup and management
 * - Inventory checking
 * - Customer information retrieval
 * - Refund processing
 * - Notification sending
 *
 * @module examples/real-world-integration
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

// Simulated database
const database = {
  customers: new Map<string, {
    id: string;
    name: string;
    email: string;
    tier: 'bronze' | 'silver' | 'gold';
    totalOrders: number;
    totalSpent: number;
  }>(),

  orders: new Map<string, {
    id: string;
    customerId: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    items: Array<{ productId: string; quantity: number; price: number }>;
    total: number;
    createdAt: string;
    shippedAt?: string;
    deliveredAt?: string;
  }>(),

  products: new Map<string, {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
  }>(),

  notifications: new Array<{ to: string; subject: string; body: string; sentAt: string }>()
};

// Initialize sample data
function initializeData() {
  // Customers
  database.customers.set('cust-001', {
    id: 'cust-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    tier: 'gold',
    totalOrders: 12,
    totalSpent: 2450.00
  });

  database.customers.set('cust-002', {
    id: 'cust-002',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    tier: 'silver',
    totalOrders: 5,
    totalSpent: 890.00
  });

  // Products
  database.products.set('prod-001', {
    id: 'prod-001',
    name: 'Wireless Headphones',
    price: 79.99,
    stock: 45,
    category: 'Electronics'
  });

  database.products.set('prod-002', {
    id: 'prod-002',
    name: 'USB-C Cable',
    price: 12.99,
    stock: 200,
    category: 'Electronics'
  });

  database.products.set('prod-003', {
    id: 'prod-003',
    name: 'Coffee Mug',
    price: 15.99,
    stock: 0,
    category: 'Home'
  });

  // Orders
  database.orders.set('ord-001', {
    id: 'ord-001',
    customerId: 'cust-001',
    status: 'delivered',
    items: [
      { productId: 'prod-001', quantity: 1, price: 79.99 },
      { productId: 'prod-002', quantity: 2, price: 12.99 }
    ],
    total: 105.97,
    createdAt: '2026-01-01T10:00:00Z',
    shippedAt: '2026-01-01T14:00:00Z',
    deliveredAt: '2026-01-03T10:30:00Z'
  });

  database.orders.set('ord-002', {
    id: 'ord-002',
    customerId: 'cust-001',
    status: 'processing',
    items: [
      { productId: 'prod-003', quantity: 1, price: 15.99 }
    ],
    total: 15.99,
    createdAt: '2026-01-08T09:00:00Z'
  });

  database.orders.set('ord-003', {
    id: 'ord-003',
    customerId: 'cust-002',
    status: 'shipped',
    items: [
      { productId: 'prod-001', quantity: 2, price: 79.99 }
    ],
    total: 159.98,
    createdAt: '2026-01-05T11:00:00Z',
    shippedAt: '2026-01-06T09:00:00Z'
  });
}

initializeData();

async function realWorldIntegration() {
  console.log('=== ToolGuardian: Real-World E-Commerce Integration ===\n');

  // Define customer service tools
  const tools = {
    // Customer lookup
    getCustomer: {
      name: 'getCustomer',
      description: 'Look up customer information by ID or email',
      fn: async ({ identifier }) => {
        // Try ID first, then email
        let customer = database.customers.get(identifier);
        if (!customer) {
          for (const [, c] of database.customers) {
            if (c.email === identifier) {
              customer = c;
              break;
            }
          }
        }
        if (!customer) {
          throw new Error('Customer not found');
        }
        return customer;
      },
      schema: {
        input: {
          identifier: {
            type: SchemaType.STRING,
            description: 'Customer ID or email address'
          }
        }
      }
    },

    // Order lookup
    getOrder: {
      name: 'getOrder',
      description: 'Get order details by order ID',
      fn: async ({ orderId }) => {
        const order = database.orders.get(orderId);
        if (!order) {
          throw new Error('Order not found');
        }

        // Enrich with product details
        const items = order.items.map(item => ({
          ...item,
          productName: database.products.get(item.productId)?.name || 'Unknown'
        }));

        return { ...order, items };
      },
      schema: {
        input: {
          orderId: {
            type: SchemaType.STRING,
            description: 'Order ID (e.g., ord-001)'
          }
        }
      }
    },

    // Customer orders
    getCustomerOrders: {
      name: 'getCustomerOrders',
      description: 'Get all orders for a customer',
      fn: async ({ customerId, status }) => {
        const orders = Array.from(database.orders.values())
          .filter(o => o.customerId === customerId && (!status || o.status === status))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return { customerId, orders, count: orders.length };
      },
      schema: {
        input: {
          customerId: { type: SchemaType.STRING },
          status: {
            type: SchemaType.STRING,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            description: 'Optional: filter by status'
          }
        }
      }
    },

    // Inventory check
    checkInventory: {
      name: 'checkInventory',
      description: 'Check stock availability for products',
      fn: async ({ productIds }) => {
        const inventory = productIds.map(id => {
          const product = database.products.get(id);
          return product ? {
            id: product.id,
            name: product.name,
            stock: product.stock,
            available: product.stock > 0
          } : { id, error: 'Product not found' };
        });

        return { inventory };
      },
      schema: {
        input: {
          productIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Array of product IDs'
          }
        }
      }
    },

    // Refund processing
    processRefund: {
      name: 'processRefund',
      description: 'Process a refund for an order',
      fn: async ({ orderId, reason }) => {
        const order = database.orders.get(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        if (order.status === 'cancelled') {
          throw new Error('Order already cancelled');
        }

        // Update order status
        order.status = 'cancelled';

        // Restock items
        for (const item of order.items) {
          const product = database.products.get(item.productId);
          if (product) {
            product.stock += item.quantity;
          }
        }

        return {
          orderId,
          refundAmount: order.total,
          status: 'processed',
          reason,
          processedAt: new Date().toISOString()
        };
      },
      prerequisites: ['getOrder'], // Must verify order exists first
      schema: {
        input: {
          orderId: { type: SchemaType.STRING },
          reason: {
            type: SchemaType.STRING,
            description: 'Reason for refund',
            minLength: 10
          }
        }
      }
    },

    // Send notification
    sendNotification: {
      name: 'sendNotification',
      description: 'Send a notification to a customer',
      fn: async ({ customerId, subject, message }) => {
        const customer = database.customers.get(customerId);
        if (!customer) {
          throw new Error('Customer not found');
        }

        const notification = {
          to: customer.email,
          subject,
          body: message,
          sentAt: new Date().toISOString()
        };

        database.notifications.push(notification);

        return {
          sent: true,
          notificationId: `notif-${Date.now()}`,
          recipient: customer.email
        };
      },
      schema: {
        input: {
          customerId: { type: SchemaType.STRING },
          subject: { type: SchemaType.STRING, minLength: 1 },
          message: { type: SchemaType.STRING, minLength: 1 }
        }
      }
    },

    // Update shipping
    updateShipping: {
      name: 'updateShipping',
      description: 'Update order shipping status',
      fn: async ({ orderId, status, trackingNumber }) => {
        const order = database.orders.get(orderId);
        if (!order) {
          throw new Error('Order not found');
        }

        order.status = status;
        if (status === 'shipped') {
          order.shippedAt = new Date().toISOString();
        } else if (status === 'delivered') {
          order.deliveredAt = new Date().toISOString();
        }

        return {
          orderId,
          newStatus: status,
          trackingNumber,
          updatedAt: new Date().toISOString()
        };
      },
      schema: {
        input: {
          orderId: { type: SchemaType.STRING },
          status: {
            type: SchemaType.STRING,
            enum: ['processing', 'shipped', 'delivered']
          },
          trackingNumber: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian = new ToolGuardian({
    tools,
    enableMonitoring: true
  });

  console.log('1. Customer Service: Look up customer\n');

  const customer = await guardian.execute('getCustomer', {
    identifier: 'cust-001'
  });
  console.log(`  Customer: ${customer.result?.name}`);
  console.log(`  Email: ${customer.result?.email}`);
  console.log(`  Tier: ${customer.result?.tier}`);
  console.log(`  Total Orders: ${customer.result?.totalOrders}`);
  console.log(`  Total Spent: $${customer.result?.totalSpent.toFixed(2)}\n`);

  console.log('2. Customer Service: Check order status\n');

  const order = await guardian.execute('getOrder', {
    orderId: 'ord-001'
  });
  console.log(`  Order ID: ${order.result?.id}`);
  console.log(`  Status: ${order.result?.status}`);
  console.log(`  Items:`);
  for (const item of order.result?.items || []) {
    console.log(`    - ${item.productName} x${item.quantity} = $${item.price}`);
  }
  console.log(`  Total: $${order.result?.total.toFixed(2)}\n`);

  console.log('3. Customer Service: Get all customer orders\n');

  const orders = await guardian.execute('getCustomerOrders', {
    customerId: 'cust-001'
  });
  console.log(`  Found ${orders.result?.count} orders:`);
  for (const o of orders.result?.orders || []) {
    console.log(`    - ${o.id}: ${o.status} ($${o.total.toFixed(2)})`);
  }

  console.log('\n4. Customer Service: Check inventory\n');

  const inventory = await guardian.execute('checkInventory', {
    productIds: ['prod-001', 'prod-002', 'prod-003']
  });
  console.log('  Inventory status:');
  for (const item of inventory.result?.inventory || []) {
    const stockStatus = item.available ? '✓ In stock' : '✗ Out of stock';
    console.log(`    - ${item.name}: ${item.stock} units (${stockStatus})`);
  }

  console.log('\n5. Customer Service: Process refund\n');

  const refund = await guardian.execute('processRefund', {
    orderId: 'ord-002',
    reason: 'Customer requested cancellation - no longer needed'
  });
  console.log(`  Refund processed: $${refund.result?.refundAmount.toFixed(2)}`);
  console.log(`  Order ${refund.result?.orderId} status: ${refund.result?.status}\n`);

  console.log('6. Verify inventory after refund:\n');

  const inventoryAfter = await guardian.execute('checkInventory', {
    productIds: ['prod-003']
  });
  console.log('  Updated inventory:');
  for (const item of inventoryAfter.result?.inventory || []) {
    console.log(`    - ${item.name}: ${item.stock} units`);
  }

  console.log('\n7. Customer Service: Send notification\n');

  const notification = await guardian.execute('sendNotification', {
    customerId: 'cust-001',
    subject: 'Refund Processed',
    message: 'Your refund for order ord-002 has been processed. The amount of $15.99 will be credited to your account within 3-5 business days.'
  });
  console.log(`  Notification sent to: ${notification.result?.recipient}`);
  console.log(`  Notification ID: ${notification.result?.notificationId}\n`);

  console.log('8. Workflow: Complete order shipping update\n');

  const shippingUpdate = await guardian.executeChain([
    { tool: 'getOrder', parameters: { orderId: 'ord-003' } },
    { tool: 'updateShipping', parameters: { orderId: 'ord-003', status: 'delivered', trackingNumber: 'TRACK-123456' } },
    { tool: 'sendNotification', parameters: { customerId: 'cust-002', subject: 'Order Delivered', message: 'Your order ord-003 has been delivered!' } }
  ]);

  console.log('  Workflow results:');
  for (const step of shippingUpdate) {
    console.log(`    - ${step.functionName}: ${step.status}`);
  }

  console.log('\n9. Get execution metrics:\n');

  const metrics = guardian.getMetrics();
  console.log(`  Total executions: ${metrics.totalExecutions}`);
  console.log(`  Success rate: ${((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`);
  console.log(`  Average time: ${metrics.averageExecutionTime.toFixed(2)}ms`);

  console.log('\n10. Function call counts:\n');

  for (const [fn, count] of Object.entries(metrics.functionCallCounts)) {
    console.log(`  ${fn}: ${count} calls`);
  }

  console.log('\n✓ Real-world integration demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  realWorldIntegration().catch(console.error);
}

export { realWorldIntegration };
