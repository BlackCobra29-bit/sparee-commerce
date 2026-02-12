// ==========================
    // PRODUCT DATA (edit here)
    // ==========================
    const PRODUCTS = [
      {
        sku: "BRK-PAD-214", name: "Ceramic Brake Pads Set", category: "Brakes", brand: "Brembo", condition: "New",
        rating: 4.6, reviews: 312, price: 48.99, stock: 12, badges: ["Best Seller"], oem: "04465-0D080",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Brake%20pads.JPG?width=900",
        desc: "Low-dust ceramic compound with quiet operation and consistent bite. Includes shims (sample)."
      },

      {
        sku: "BRK-SHOE-101", name: "Rear Brake Shoes", category: "Brakes", brand: "OEM", condition: "New",
        rating: 4.2, reviews: 88, price: 29.50, stock: 7, badges: ["OEM Fit"], oem: "46540-2S000",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Brake%20shoes.jpg?width=900",
        desc: "OEM-style brake shoes for drum systems. Reliable friction material and long service life (sample)."
      },

      {
        sku: "IGN-SPK-4PK", name: "Spark Plugs (4-Pack)", category: "Ignition", brand: "NGK", condition: "New",
        rating: 4.8, reviews: 540, price: 22.00, stock: 24, badges: ["Top Rated"], oem: "BKR6E-11",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Spark%20plugs.jpg?width=900",
        desc: "Improves cold start and fuel efficiency (sample). Gap/spec varies by engineâ€”check fitment."
      },

      {
        sku: "FLT-OIL-BOSCH", name: "Bosch Oil Filter", category: "Filters", brand: "Bosch", condition: "New",
        rating: 4.5, reviews: 201, price: 11.49, stock: 30, badges: ["Fast Ship"], oem: "0986AF0150",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Bosch%20Oil%20Filter.JPG?width=900",
        desc: "High-efficiency media with strong canister design. Compatible with many models (sample)."
      },

      {
        sku: "FLT-AIR-TOY-1KR", name: "Engine Air Filter (Toyota 1KR-FE)", category: "Filters", brand: "OEM", condition: "New",
        rating: 4.4, reviews: 97, price: 14.75, stock: 15, badges: ["Eco"], oem: "17801-0Y040",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Air%20filter%20for%20Toyota%201KR-FE.jpg?width=900",
        desc: "Direct-fit air filter with durable frame. Replace every 10kâ€“15k miles (sample)."
      },

      {
        sku: "EXH-DPF-009", name: "Diesel Particulate Filter (DPF)", category: "Exhaust", brand: "OEM", condition: "Refurbished",
        rating: 4.0, reviews: 44, price: 249.99, stock: 3, badges: ["Limited"], oem: "DPF-009X",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Diesel%20particulate%20filter%2001.JPG?width=900",
        desc: "DPF unit (sample). Ensure model/engine match; installation may require ECU adaptation."
      },
      {
        sku: "SUS-SHOCK-01",
        name: "Rear Shock Absorber",
        category: "Suspension",
        brand: "KYB",
        condition: "New",
        rating: 4.3,
        reviews: 127,
        price: 61.00,
        stock: 5,
        badges: ["Low Stock"],
        oem: "KYB-343380",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Brake%20shoes.jpg?width=900",
        desc: "OE-quality damping for stability and comfort. Verify mounting style and length (sample)."
      },

      // Bundle SKU used in Deals section:
      {
        sku: "KIT-BRAKE-01", name: "Brake Service Kit", category: "Brakes", brand: "OEM", condition: "New",
        rating: 4.3, reviews: 51, price: 89.00, stock: 9, badges: ["Bundle"], oem: "KIT-214-101",
        img: "https://commons.wikimedia.org/wiki/Special:FilePath/Brake%20pads.JPG?width=900",
        desc: "Bundle kit (sample): pads + shoes + hardware. Great value for full rear service."
      }
    ];

    // ==========================
    // STATE (persisted)
    // ==========================
    const LS = {
      cart: "wahid_cart_v2",
      wish: "wahid_wish_v2",
      compare: "wahid_compare_v2",
      vehicle: "wahid_vehicle_v2"
    };

    let view = [...PRODUCTS];
    let cart = loadLS(LS.cart, []);        // [{sku, qty}]
    let wish = loadLS(LS.wish, []);        // [sku]
    let compare = loadLS(LS.compare, []);  // [sku]
    let savedVehicle = loadLS(LS.vehicle, null); // {make, year} or null

    // ==========================
    // HELPERS
    // ==========================
    function loadLS(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    }
    function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

    const money = (n) => `$${Number(n).toFixed(2)}`;
    const bySku = (sku) => PRODUCTS.find(p => p.sku === sku);

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function stars(rating) {
      const full = Math.floor(rating);
      const half = (rating - full) >= 0.5;
      let html = '';
      for (let i = 0; i < 5; i++) {
        if (i < full) html += '<i class="fas fa-star"></i>';
        else if (i === full && half) html += '<i class="fas fa-star-half-alt"></i>';
        else html += '<i class="far fa-star"></i>';
      }
      return html;
    }

    function toast(title, body) {
      $('#toastTitle').text(title);
      $('#toastBody').text(body);
      $('#appToast').toast('show');
    }

    function updateSavedVehicleBadge() {
      if (savedVehicle && savedVehicle.make && savedVehicle.year) {
        $('#savedVehicle').removeClass('d-none').text(`Saved vehicle: ${savedVehicle.make} ${savedVehicle.year}`);
      } else {
        $('#savedVehicle').removeClass('d-none').text('No vehicle saved');
      }
    }

    // ==========================
    // SEARCH SUGGESTIONS
    // ==========================
    function buildSuggestions(q) {
      const box = $('#suggestBox');
      box.empty();
      if (!q) { box.hide(); return; }

      const hits = PRODUCTS
        .filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.oem || "").toLowerCase().includes(q)
        )
        .slice(0, 6);

      if (hits.length === 0) { box.hide(); return; }

      hits.forEach(p => {
        box.append(`
          <div class="item" onclick="openQuickView('${p.sku}')">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="font-weight-bold">${escapeHtml(p.name)}</div>
                <div class="muted small">${escapeHtml(p.brand)} â€¢ ${escapeHtml(p.category)} â€¢ SKU: ${escapeHtml(p.sku)}</div>
              </div>
              <div class="font-weight-bold">${money(p.price)}</div>
            </div>
          </div>
        `);
      });

      box.show();
    }

    // ==========================
    // RENDER: SKELETON
    // ==========================
    function renderSkeletons(n = 6) {
      const grid = $('#productGrid');
      grid.empty();
      for (let i = 0; i < n; i++) {
        grid.append(`
          <div class="col-sm-6 col-lg-3 mb-4">
            <div class="product-card p-3">
              <div class="skeleton" style="height:160px;"></div>
              <div class="skeleton mt-3" style="height:18px;width:80%;"></div>
              <div class="skeleton mt-2" style="height:14px;width:60%;"></div>
              <div class="skeleton mt-3" style="height:38px;width:100%;"></div>
            </div>
          </div>
        `);
      }
    }

    // ==========================
    // RENDER: PRODUCTS
    // ==========================
    function renderProducts(items) {
      const grid = $('#productGrid');
      grid.empty();

      items.forEach((p, i) => {
        const delay = (i % 6) * 60;
        const badgeHtml = (p.badges || []).slice(0, 2).map(b => {
          const cls =
            b === 'Limited' ? 'badge badge-danger' :
              b === 'Top Rated' ? 'badge badge-success' :
                b === 'Best Seller' ? 'badge badge-warning' :
                  b === 'Low Stock' ? 'badge badge-warning' :
                    b === 'Bundle' ? 'badge badge-soft' : 'badge badge-soft';
          return `<span class="${cls}">${escapeHtml(b)}</span>`;
        }).join('');

        const stockBadge = p.stock <= 5
          ? `<span class="badge badge-warning">Low</span>`
          : `<span class="badge badge-soft">In</span>`;

        const wishOn = wish.includes(p.sku);
        const compOn = compare.includes(p.sku);

        const fitHint = (savedVehicle && savedVehicle.make)
          ? `<span class="badge badge-ghost ml-2">Fitment: saved</span>`
          : ``;

        grid.append(`
          <div class="col-sm-6 col-lg-3 mb-4" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="product-card">
              <div class="p-img">
                <img src="${p.img}" alt="${escapeHtml(p.name)}">
                <div class="p-badges">${badgeHtml}</div>
                <div class="p-actions">
                  <div class="icon-btn" title="Quick view" onclick="openQuickView('${p.sku}')">
                    <i class="fas fa-eye"></i>
                  </div>
                  <div class="icon-btn" title="Wishlist" onclick="toggleWish('${p.sku}')">
                    <i class="${wishOn ? 'fas' : 'far'} fa-heart"></i>
                  </div>
                  <div class="icon-btn" title="Compare" onclick="toggleCompare('${p.sku}')">
                    <i class="fas fa-balance-scale"></i>
                  </div>
                </div>
              </div>

              <div class="p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div style="min-width:0">
                    <div class="font-weight-bold text-truncate">${escapeHtml(p.name)}</div>
                    <div class="muted small">${escapeHtml(p.brand)} â€¢ ${escapeHtml(p.category)} ${fitHint}</div>
                  </div>
                  <div class="text-right">
                    <div class="price">${money(p.price)}</div>
                    <div class="muted small">${stockBadge} â€¢ Stock: <b>${p.stock}</b></div>
                  </div>
                </div>

                <div class="d-flex align-items-center justify-content-between mt-2">
                  <div class="rating">${stars(p.rating)} <span class="muted small ml-1">${p.rating.toFixed(1)} (${p.reviews})</span></div>
                </div>

                <div class="muted small mt-2" style="min-height:42px">
                  ${escapeHtml(p.desc)}
                </div>

                <div class="d-flex mt-3">
                  <button class="btn btn-success btn-sm btn-block mr-2" onclick="addToCartBySku('${p.sku}')">
                    <i class="fas fa-cart-plus mr-1"></i>Add
                  </button>
                  <button class="btn btn-outline-light btn-sm btn-block" onclick="openQuickView('${p.sku}')">
                    Details
                  </button>
                </div>

                <div class="mt-3 muted small">
                  OEM: <span class="kbd">${escapeHtml(p.oem || 'â€”')}</span>
                  <span class="ml-2">SKU:</span> <span class="kbd">${escapeHtml(p.sku)}</span>
                </div>
              </div>
            </div>
          </div>
        `);
      });

      $('#resultCount').text(items.length);
      if (window.AOS) AOS.refresh();
    }

    // ==========================
    // QUICK VIEW
    // ==========================
    function openQuickView(sku) {
      const p = bySku(sku);
      if (!p) return;

      $('#qvTitle').text(p.name);
      $('#qvImg').attr('src', p.img);
      $('#qvPrice').text(money(p.price));
      $('#qvDesc').text(p.desc);
      $('#qvSku').text(p.sku);
      $('#qvStock').text(p.stock);
      $('#qvMeta').text(`${p.brand} â€¢ ${p.category} â€¢ Condition: ${p.condition} â€¢ Stock: ${p.stock}`);
      $('#qvCross').text(`Cross refs: ${p.oem || 'â€”'} â€¢ ALT-${p.sku} â€¢ ${p.brand.toUpperCase()}-${p.oem || 'X'}`);
      $('#qvRating').html(stars(p.rating) + ` <span class="muted small ml-1">${p.rating.toFixed(1)} (${p.reviews})</span>`);

      $('#qvFitBadge').text(savedVehicle ? 'Vehicle saved' : 'Not checked');

      $('#qvAdd').off('click').on('click', () => addToCartBySku(p.sku));
      $('#qvWish').off('click').on('click', () => toggleWish(p.sku));
      $('#qvCompare').off('click').on('click', () => toggleCompare(p.sku));

      $('#quickView').modal('show');
    }

    // ==========================
    // WISHLIST / COMPARE
    // ==========================
    function toggleWish(sku) {
      if (wish.includes(sku)) wish = wish.filter(x => x !== sku);
      else wish.push(sku);
      saveLS(LS.wish, wish);
      toast('Wishlist', wish.includes(sku) ? 'Added to wishlist.' : 'Removed from wishlist.');
      applyAll(false);
    }

    function toggleCompare(sku) {
      if (compare.includes(sku)) {
        compare = compare.filter(x => x !== sku);
      } else {
        if (compare.length >= 3) {
          toast('Compare', 'You can compare up to 3 items.');
          return;
        }
        compare.push(sku);
      }
      saveLS(LS.compare, compare);
      renderCompareUI();
      applyAll(false);
      toast('Compare', compare.includes(sku) ? 'Added to compare.' : 'Removed from compare.');
    }

    function clearCompare() {
      compare = [];
      saveLS(LS.compare, compare);
      renderCompareUI();
      toast('Compare', 'Cleared.');
    }

    function renderCompareUI() {
      $('#compareCount').text(compare.length);
      $('#dockCount').text(compare.length);
      $('#compareDock').toggle(compare.length > 0);

      // headers
      const cols = [compare[0], compare[1], compare[2]].map(sku => bySku(sku));
      $('#c1').text(cols[0]?.name || 'â€”');
      $('#c2').text(cols[1]?.name || 'â€”');
      $('#c3').text(cols[2]?.name || 'â€”');

      // table
      const rows = [
        { k: 'SKU', v: p => p?.sku || 'â€”' },
        { k: 'Brand', v: p => p?.brand || 'â€”' },
        { k: 'Category', v: p => p?.category || 'â€”' },
        { k: 'OEM', v: p => p?.oem || 'â€”' },
        { k: 'Condition', v: p => p?.condition || 'â€”' },
        { k: 'Rating', v: p => p ? `${p.rating.toFixed(1)} (${p.reviews})` : 'â€”' },
        { k: 'Price', v: p => p ? money(p.price) : 'â€”' },
        { k: 'Stock', v: p => p ? String(p.stock) : 'â€”' }
      ];

      const tbody = $('#compareTable');
      tbody.empty();
      rows.forEach(r => {
        tbody.append(`
          <tr>
            <td class="font-weight-bold">${r.k}</td>
            <td>${escapeHtml(r.v(cols[0]))}</td>
            <td>${escapeHtml(r.v(cols[1]))}</td>
            <td>${escapeHtml(r.v(cols[2]))}</td>
          </tr>
        `);
      });
    }

    // ==========================
    // CART
    // ==========================
    function addToCartBySku(sku) {
      const p = bySku(sku);
      if (!p) return;
      const item = cart.find(x => x.sku === sku);
      if (item) item.qty += 1;
      else cart.push({ sku, qty: 1 });
      saveLS(LS.cart, cart);
      toast('Cart', `${p.name} added.`);
      renderCartBadge();
      renderCartTable();
    }

    function removeFromCart(sku) {
      cart = cart.filter(x => x.sku !== sku);
      saveLS(LS.cart, cart);
      renderCartBadge();
      renderCartTable();
    }

    function setQty(sku, qty) {
      const item = cart.find(x => x.sku === sku);
      if (!item) return;
      item.qty = Math.max(1, qty);
      saveLS(LS.cart, cart);
      renderCartBadge();
      renderCartTable();
    }

    function clearCart() {
      cart = [];
      saveLS(LS.cart, cart);
      toast('Cart', 'Cart cleared.');
      renderCartBadge();
      renderCartTable();
    }

    function renderCartBadge() {
      const count = cart.reduce((acc, x) => acc + x.qty, 0);
      $('#cartCount').text(count);
    }

    function renderCartTable() {
      const tbody = $('#cartTable');
      tbody.empty();

      let subtotal = 0;
      cart.forEach(item => {
        const p = bySku(item.sku);
        const line = p.price * item.qty;
        subtotal += line;

        tbody.append(`
          <tr>
            <td>${escapeHtml(p.name)}<div class="muted small">${escapeHtml(p.brand)} â€¢ ${escapeHtml(p.category)}</div></td>
            <td><span class="kbd">${escapeHtml(p.sku)}</span></td>
            <td class="text-right">${money(p.price)}</td>
            <td class="text-center" style="max-width:120px">
              <input type="number" min="1" value="${item.qty}" class="form-control form-control-sm"
                     onchange="setQty('${p.sku}', parseInt(this.value||'1',10))">
            </td>
            <td class="text-right">${money(line)}</td>
            <td class="text-right">
              <button class="btn btn-outline-light btn-sm" onclick="removeFromCart('${p.sku}')">
                <i class="fas fa-times"></i>
              </button>
            </td>
          </tr>
        `);
      });

      if (cart.length === 0) {
        tbody.append(`<tr><td colspan="6" class="text-center muted py-4">Your cart is empty.</td></tr>`);
      }

      $('#cartSubtotal').text(money(subtotal));
    }

    // ==========================
    // FILTERS + SEARCH
    // ==========================
    function applyAll(showToast = true) {
      const q = ($('#q').val() || '').trim().toLowerCase();

      const cat = $('#filterCategory').val() || 'All';
      const brand = $('#filterBrand').val() || 'All';
      const min = parseFloat($('#minPrice').val());
      const max = parseFloat($('#maxPrice').val());

      const allowNew = $('#condNew').is(':checked');
      const allowRefurb = $('#condRefurb').is(':checked');

      const ratingMin = $('#r45').is(':checked') ? 4.5 : ($('#r4').is(':checked') ? 4.0 : 0);
      const stockMode = $('#filterStock').val() || 'All';

      view = PRODUCTS.filter(p => {
        const matchQ = !q || (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.oem || "").toLowerCase().includes(q)
        );

        const matchCat = (cat === 'All') || (p.category === cat);
        const matchBrand = (brand === 'All') || (p.brand === brand);

        const matchMin = Number.isFinite(min) ? (p.price >= min) : true;
        const matchMax = Number.isFinite(max) ? (p.price <= max) : true;

        const matchCond =
          (allowNew && p.condition === 'New') ||
          (allowRefurb && p.condition === 'Refurbished');

        const matchRating = p.rating >= ratingMin;

        const matchStock =
          (stockMode === 'All') ||
          (stockMode === 'In' && p.stock > 0) ||
          (stockMode === 'Low' && p.stock > 0 && p.stock <= 5);

        return matchQ && matchCat && matchBrand && matchMin && matchMax && matchCond && matchRating && matchStock;
      });

      // sort
      const sortBy = $('#sortBy').val();
      if (sortBy === 'priceAsc') view.sort((a, b) => a.price - b.price);
      if (sortBy === 'priceDesc') view.sort((a, b) => b.price - a.price);
      if (sortBy === 'ratingDesc') view.sort((a, b) => b.rating - a.rating);
      if (sortBy === 'stockDesc') view.sort((a, b) => b.stock - a.stock);

      // active filters count
      let active = 0;
      if (q) active++;
      if (cat !== 'All') active++;
      if (brand !== 'All') active++;
      if (Number.isFinite(min) || Number.isFinite(max)) active++;
      if (!allowNew || allowRefurb) active++;
      if (ratingMin > 0) active++;
      if (stockMode !== 'All') active++;

      $('#activeFilters').text(active);

      renderProducts(view);

      if (showToast) toast('Filters', `Applied â€¢ ${active} active`);
    }

    function resetAll() {
      $('#q').val('');
      $('#filterCategory').val('All');
      $('#filterBrand').val('All');
      $('#minPrice').val('');
      $('#maxPrice').val('');
      $('#condNew').prop('checked', true);
      $('#condRefurb').prop('checked', false);
      $('#rAll').prop('checked', true);
      $('#filterStock').val('All');
      $('#sortBy').val('relevance');

      $('.chip').removeClass('active');
      $('.chip[data-chip="All"]').addClass('active');

      view = [...PRODUCTS];
      $('#activeFilters').text(0);
      renderProducts(view);
    }

    // ==========================
    // FITMENT (inline)
    // ==========================
    function renderFitmentRecs() {
      const box = $('#fitmentRecs');
      box.empty();

      // lightweight â€œrecommendationsâ€
      const recs = PRODUCTS.slice(0, 4);
      recs.forEach(p => {
        box.append(`
          <div class="col-sm-6 mb-3">
            <div class="panel" style="background:var(--glass2)">
              <div class="panel-b">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="font-weight-bold">${escapeHtml(p.name)}</div>
                  <div class="font-weight-bold">${money(p.price)}</div>
                </div>
                <div class="muted small">${escapeHtml(p.brand)} â€¢ ${escapeHtml(p.category)} â€¢ OEM: ${escapeHtml(p.oem || 'â€”')}</div>
                <div class="d-flex mt-2">
                  <button class="btn btn-success btn-sm btn-block mr-2" onclick="addToCartBySku('${p.sku}')"><i class="fas fa-cart-plus mr-1"></i>Add</button>
                  <button class="btn btn-outline-light btn-sm btn-block" onclick="openQuickView('${p.sku}')">Details</button>
                </div>
              </div>
            </div>
          </div>
        `);
      });
    }

    // ==========================
    // WIZARD
    // ==========================
    let wiz = { step: 1, make: "", year: "", engine: "" };

    function renderWizard() {
      $('#wizStep').text(wiz.step);
      $('#wizProg').css('width', (wiz.step * 33.33) + '%');

      const body = $('#wizBody');
      body.empty();

      if (wiz.step === 1) {
        $('#wizHint').text('Select a Make');
        body.append(`
          <div class="panel" style="background:var(--glass2)">
            <div class="panel-b">
              <label class="muted mb-1">Make</label>
              <select class="custom-select" id="wizMake">
                <option value="">Select</option>
                <option>Toyota</option><option>Hyundai</option><option>Ford</option><option>Nissan</option>
              </select>
              <div class="muted small mt-2">Tip: store make/model/year as a saved profile for faster shopping.</div>
            </div>
          </div>
        `);
        $('#wizMake').val(wiz.make);
      }

      if (wiz.step === 2) {
        $('#wizHint').text('Pick Year');
        body.append(`
          <div class="panel" style="background:var(--glass2)">
            <div class="panel-b">
              <label class="muted mb-1">Year</label>
              <select class="custom-select" id="wizYear">
                <option value="">Select</option>
                <option>2018</option><option>2019</option><option>2020</option><option>2021</option><option>2022</option>
              </select>
              <div class="muted small mt-2">Pro: use VIN decode to auto-fill this step.</div>
            </div>
          </div>
        `);
        $('#wizYear').val(wiz.year);
      }

      if (wiz.step === 3) {
        $('#wizHint').text('Confirm & Save');
        body.append(`
          <div class="panel" style="background:var(--glass2)">
            <div class="panel-b">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="font-weight-bold">Vehicle Profile</div>
                  <div class="muted small">This will improve search relevance (demo).</div>
                </div>
                <span class="badge badge-soft">Ready</span>
              </div>

              <hr class="divider">

              <div class="row">
                <div class="col-md-6 mb-2">
                  <div class="muted small">Make</div>
                  <div class="font-weight-bold" id="wizSummaryMake">${escapeHtml(wiz.make || 'â€”')}</div>
                </div>
                <div class="col-md-6 mb-2">
                  <div class="muted small">Year</div>
                  <div class="font-weight-bold" id="wizSummaryYear">${escapeHtml(wiz.year || 'â€”')}</div>
                </div>
              </div>

              <button class="btn btn-success btn-block mt-3" id="wizSave">
                <i class="fas fa-save mr-2"></i>Save Vehicle Profile
              </button>
            </div>
          </div>
        `);

        $('#wizSave').on('click', () => {
          if (!wiz.make || !wiz.year) {
            toast('Fitment', 'Please complete steps 1 and 2.');
            return;
          }
          savedVehicle = { make: wiz.make, year: wiz.year };
          saveLS(LS.vehicle, savedVehicle);
          updateSavedVehicleBadge();
          $('#fitmentBadge').text('Vehicle saved').removeClass('badge-soft').addClass('badge badge-success');
          toast('Fitment', `Saved: ${wiz.make} ${wiz.year}`);
          $('#fitmentWizard').modal('hide');
          applyAll(false);
        });
      }

      $('#wizBack').prop('disabled', wiz.step === 1);
      $('#wizNext').text(wiz.step === 3 ? 'Finish' : 'Next');
    }

    // ==========================
    // EVENTS
    // ==========================
    $(function () {
      if (window.AOS) {
        AOS.init({
          duration: 700,
          easing: 'ease-out-cubic',
          offset: 80,
          once: true
        });
      }

      // skeleton then render (gives â€œpremiumâ€ feel)
      renderSkeletons(6);
      setTimeout(() => { resetAll(); }, 350);

      // init UI
      renderCartBadge();
      renderCartTable();
      renderCompareUI();
      renderFitmentRecs();
      updateSavedVehicleBadge();

      // Fitment badge state
      if (savedVehicle) $('#fitmentBadge').text('Vehicle saved').removeClass('badge-soft').addClass('badge badge-success');

      // Search / suggestions
      $('#q').on('input', function () {
        const q = ($(this).val() || '').trim().toLowerCase();
        buildSuggestions(q);
      });
      $(document).on('click', function (e) {
        if (!$(e.target).closest('.search-wrap').length) $('#suggestBox').hide();
      });

      $('#btnSearch').on('click', () => { $('#suggestBox').hide(); applyAll(false); toast('Search', 'Results updated.'); });
      $('#btnVoice').on('click', () => toast('Voice', 'Voice search is UI-only in this template.'));

      // Filters
      $('#btnApply').on('click', () => applyAll(false));
      $('#btnReset').on('click', () => { resetAll(); toast('Filters', 'Reset complete.'); });
      $('#btnReset2').on('click', () => { resetAll(); toast('Filters', 'Reset complete.'); });
      $('#sortBy').on('change', () => applyAll(false));

      // Chips drive category
      $('.chip').on('click', function () {
        $('.chip').removeClass('active');
        $(this).addClass('active');
        const c = $(this).data('chip');
        $('#filterCategory').val(c === 'All' ? 'All' : c);
        applyAll(false);
      });

      // Deal button
      $('#btnDeal').on('click', () => openQuickView('BRK-PAD-214'));

      // Fitment quick check
      $('#btnFitment').on('click', () => {
        const make = $('#make').val();
        const year = $('#year').val();
        const vin = ($('#vin').val() || '').trim();

        if (!vin && (!make || !year)) {
          toast('Fitment', 'Enter VIN or select Make + Year (demo).');
          return;
        }
        const chosenMake = make || 'VIN vehicle';
        const chosenYear = year || 'â€”';

        savedVehicle = { make: chosenMake, year: chosenYear };
        saveLS(LS.vehicle, savedVehicle);
        updateSavedVehicleBadge();
        $('#fitmentBadge').text('Vehicle saved').removeClass('badge-soft').addClass('badge badge-success');
        toast('Fitment', `Saved: ${chosenMake} ${chosenYear}`);
        applyAll(false);
      });

      // Wizard modal open
      $('#fitmentWizard').on('shown.bs.modal', () => {
        wiz = { step: 1, make: "", year: "", engine: "" };
        renderWizard();
      });

      $('#wizBack').on('click', () => {
        wiz.step = Math.max(1, wiz.step - 1);
        renderWizard();
      });

      $('#wizNext').on('click', () => {
        if (wiz.step === 1) {
          wiz.make = ($('#wizMake').val() || '').trim();
          if (!wiz.make) { toast('Wizard', 'Pick a make first.'); return; }
          wiz.step = 2; renderWizard(); return;
        }
        if (wiz.step === 2) {
          wiz.year = ($('#wizYear').val() || '').trim();
          if (!wiz.year) { toast('Wizard', 'Pick a year first.'); return; }
          wiz.step = 3; renderWizard(); return;
        }
        if (wiz.step === 3) {
          // Finish button handled by Save
          toast('Wizard', 'Press "Save Vehicle Profile" to finish.');
        }
      });

      // Hotkeys
      document.addEventListener('keydown', (e) => {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

        if (e.key === '/' && !typing) {
          e.preventDefault();
          $('#q').focus();
        }
        if (e.key === 'Escape') {
          if (document.activeElement === document.getElementById('q')) {
            $('#q').val('');
            $('#suggestBox').hide();
            applyAll(false);
            toast('Search', 'Cleared.');
          }
        }
        if ((e.key === 'c' || e.key === 'C') && !typing) {
          $('#cartModal').modal('show');
        }
      });

      $('#btnHotkey').on('click', () => toast('Hotkeys', 'Press "/" for search â€¢ "C" for cart â€¢ Esc to clear search'));

      // Load more demo
      $('#btnLoadMore').on('click', () => toast('Demo', 'Pagination is UI-only in this template.'));
    });

    // Expose some functions for inline onclick
    window.openQuickView = openQuickView;
    window.addToCartBySku = addToCartBySku;
    window.clearCart = clearCart;
    window.toggleWish = toggleWish;
    window.toggleCompare = toggleCompare;
    window.clearCompare = clearCompare;
    window.toast = toast;
    window.setQty = setQty;
    window.removeFromCart = removeFromCart;
