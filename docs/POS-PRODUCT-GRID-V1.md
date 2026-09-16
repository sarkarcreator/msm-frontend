# POS Product Grid V1

The touch-first POS workspace now reads tenant-scoped products from the existing IndexedDB layer and exposes up to 12 in-stock products as quick touch cards.

Selecting a product delegates the selection back into the existing POS search input and submits it through the existing POS workflow. No sale, inventory, payment, or backend logic is duplicated in this layer.
