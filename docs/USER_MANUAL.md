# User Manual

## Dashboard

The dashboard summarizes daily sales, daily profit, monthly totals, stock value, inventory count, low stock, receivables, supplier payables, expenses and cash in hand.

## Product Management

Use Products to maintain phones, accessories and repair parts. Track brand, model, barcode, IMEI, serial number, warranty, purchase price, sale price, supplier and stock status.

## Sales

Sales supports cash, credit and partial payment workflows. Each sale should reduce product stock, calculate profit, save the customer purchase history and add any unpaid balance to customer credit.

## Customers And Udhaar

Customer records store phone, address, CNIC and notes. The ledger shows purchases, payments, credit balance, due dates and recovery activity.

## Suppliers And Purchases

Supplier records track balance and purchase history. Purchase receiving increases stock and records supplier payable amounts.

## Expenses And Accounting

Expenses are categorized by rent, electricity, salary, internet, transport, maintenance and other. Cashbook entries track debits, credits, income, expenses, profit and daily closing.

## Repairs

Repair jobs track customer device, IMEI, current status, technician notes, repair charges and delivery status. Supported statuses are Received, In Progress, Waiting Parts, Completed and Delivered.

## Offline Mode

The PWA stores operational records locally in IndexedDB. Sales, products, customer changes, expenses and repair jobs can be created while offline. Pending records are held in the sync queue until internet returns.

## Sync

When online, the sync engine pushes queued operations to the Laravel API. The backend prevents duplicate records by using UUIDs and reports conflicts when the server copy is newer than the client copy.

## Backups

Production deployments should configure automatic MySQL backups and periodic export downloads. A restore should always be tested on a staging database before being used on the live shop database.
