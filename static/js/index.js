// ==========================
// PRODUCT DATA (from Django view)
// ==========================
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProduct(raw = {}) {
  const sku = String(raw.sku || raw.vin || "").trim();
  return {
    sku,
    name: String(raw.name || "Unnamed product"),
    category: String(raw.category || "Other"),
    brand: String(raw.brand || raw.seller_name || "Unknown"),
    seller_name: String(raw.seller_name || raw.brand || "Unknown"),
    seller_photo: String(raw.seller_photo || ""),
    owner_id: toNumber(raw.owner_id, 0),
    condition: String(raw.condition || "New"),
    rating: toNumber(raw.rating, 0),
    reviews: Math.max(0, Math.trunc(toNumber(raw.reviews, 0))),
    price: Math.max(0, toNumber(raw.price, 0)),
    stock: Math.max(0, Math.trunc(toNumber(raw.stock, 0))),
    badges: Array.isArray(raw.badges) ? raw.badges.map((v) => String(v)) : [],
    oem: String(raw.oem || raw.sku || raw.vin || ""),
    img: String(raw.img || ""),
    desc: String(raw.desc || raw.description || ""),
  };
}

function readProductsFromView() {
  const node = document.getElementById("shop-products-data");
  if (!node) return [];

  try {
    const parsed = JSON.parse(node.textContent || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProduct).filter((p) => p.sku && p.stock > 0);
  } catch (e) {
    return [];
  }
}

const PRODUCTS = readProductsFromView();
function readRatingContext() {
  const node = document.getElementById("shop-rating-context");
  if (!node) {
    return {
      is_authenticated: false,
      can_rate: false,
      login_url: "/login/",
      rate_url_template: "/products/__SKU__/rate/",
    };
  }
  try {
    const parsed = JSON.parse(node.textContent || "{}");
    return {
      is_authenticated: !!parsed.is_authenticated,
      can_rate: !!parsed.can_rate,
      current_user_id: toNumber(parsed.current_user_id, 0),
      login_url: String(parsed.login_url || "/login/"),
      rate_url_template: String(
        parsed.rate_url_template || "/products/__SKU__/rate/"
      ),
    };
  } catch (e) {
    return {
      is_authenticated: false,
      can_rate: false,
      current_user_id: 0,
      login_url: "/login/",
      rate_url_template: "/products/__SKU__/rate/",
    };
  }
}
const RATING_CONTEXT = readRatingContext();

// ==========================
// STATE (persisted)
// ==========================
const LS = {
  cart: "wahid_cart_v2",
  wish: "wahid_wish_v2",
  compare: "wahid_compare_v2",
  vehicle: "wahid_vehicle_v2",
  rated: "wahid_rated_products_v1",
  rated_values: "wahid_rated_values_v1",
};

let view = [...PRODUCTS];
let cart = loadLS(LS.cart, []); // [{sku, qty}]
let wish = loadLS(LS.wish, []); // [sku]
let compare = loadLS(LS.compare, []); // [sku]
let savedVehicle = loadLS(LS.vehicle, null); // {make, year} or null
let ratedSkus = new Set(loadLS(LS.rated, [])); // [sku]
let ratedSkuValues = loadLS(LS.rated_values, {}); // { [sku]: rating }
let pendingRatingConfirm = null; // { sku, rating }

// ==========================
// HELPERS
// ==========================
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function getCsrfToken() {
  const key = "csrftoken=";
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(key)) {
      return decodeURIComponent(cookie.substring(key.length));
    }
  }
  return "";
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (n) => `${moneyFormatter.format(Number(n) || 0)} ETB`;
const bySku = (sku) => PRODUCTS.find((p) => p.sku === String(sku));
const truncateWords = (text, maxWords = 14) => {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ")}....`;
};
function sellerAvatarDataUri(name) {
  const initial = (
    String(name || "S")
      .trim()
      .charAt(0) || "S"
  ).toUpperCase();
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="#dff1df"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#2f6b2f">' +
    initial +
    "</text></svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<i class="fas fa-star"></i>';
    else if (i === full && half) html += '<i class="fas fa-star-half-alt"></i>';
    else html += '<i class="far fa-star"></i>';
  }
  return html;
}
function modalRatingStarsHtml(selected = 0) {
  let html = "";
  for (let i = 1; i <= 5; i += 1) {
    html += `<button type="button" class="btn btn-link p-0 mr-1 rate-modal-star" data-rating="${i}" title="${i} star${
      i > 1 ? "s" : ""
    }"><i class="${i <= selected ? "fas" : "far"} fa-star"></i></button>`;
  }
  return html;
}
function openRateNowLinkHtml(sku) {
  const safeSku = String(sku || "").replace(/'/g, "\\'");
  return `<a href="#" class="small font-weight-bold text-primary" onclick="openRateModal('${safeSku}'); return false;">Rate now</a>`;
}
function buildRateUrl(sku) {
  return RATING_CONTEXT.rate_url_template.replace(
    "__SKU__",
    encodeURIComponent(String(sku || "").trim())
  );
}
function saveRatedSkus() {
  saveLS(LS.rated, Array.from(ratedSkus));
}
function saveRatedSkuValues() {
  saveLS(LS.rated_values, ratedSkuValues);
}
function ratedStateHtml(sku) {
  const ratedValue = Math.trunc(toNumber(ratedSkuValues[sku], 0));
  if (ratedValue >= 1 && ratedValue <= 5) {
    return `<span class="badge badge-success" title="Your rating: ${ratedValue}/5">Rated</span>`;
  }
  return '<span class="badge badge-success">Rated</span>';
}
function updateProductRatingValue(sku, rating, reviews) {
  const product = bySku(sku);
  if (!product) return;
  product.rating = Math.max(0, toNumber(rating, product.rating));
  product.reviews = Math.max(0, Math.trunc(toNumber(reviews, product.reviews)));
}
function renderQuickViewRateControls(sku) {
  const box = $("#qvRateBox");
  const starsBox = $("#qvRateStars");
  if (!box.length || !starsBox.length) return;
  const product = bySku(sku);
  const isOwnProduct =
    !!product &&
    Number(product.owner_id || 0) > 0 &&
    Number(product.owner_id || 0) === Number(RATING_CONTEXT.current_user_id || 0);

  if (isOwnProduct) {
    starsBox.html(
      '<span class="muted small">You cannot rate your own product.</span>'
    );
    return;
  }

  if (ratedSkus.has(String(sku || "").trim())) {
    starsBox.html(ratedStateHtml(String(sku || "").trim()));
    return;
  }

  if (!RATING_CONTEXT.can_rate) {
    const msg = RATING_CONTEXT.is_authenticated
      ? "Only registered accounts can rate."
      : "Log in to rate this product.";
    starsBox.html(`<span class="muted small">${escapeHtml(msg)}</span>`);
    return;
  }
  starsBox.html(openRateNowLinkHtml(sku));
}
function setModalSelectedRating(rating) {
  const selected = Math.trunc(toNumber(rating, 0));
  pendingRatingConfirm = pendingRatingConfirm || { sku: "", rating: 0 };
  pendingRatingConfirm.rating = selected;
  $("#rateConfirmStars .rate-modal-star").each(function () {
    const starValue = Math.trunc(toNumber($(this).data("rating"), 0));
    const icon = $(this).find("i");
    if (starValue <= selected) {
      icon.removeClass("far").addClass("fas");
    } else {
      icon.removeClass("fas").addClass("far");
    }
  });
  $("#rateConfirmValue").text(`Selected: ${selected} / 5`);
  $("#rateConfirmSubmit").prop("disabled", selected < 1 || selected > 5);
}
function openRateModal(sku) {
  const normalizedSku = String(sku || "").trim();
  if (!normalizedSku) return;

  if (ratedSkus.has(normalizedSku)) {
    toast(
      "Rating",
      "You already rated this product. You can only rate once.",
      "error"
    );
    return;
  }

  const product = bySku(normalizedSku);
  $("#rateConfirmProduct").text(product ? product.name : `SKU: ${normalizedSku}`);
  $("#rateConfirmStars").html(modalRatingStarsHtml(0));
  pendingRatingConfirm = { sku: normalizedSku, rating: 0 };
  setModalSelectedRating(0);
  $("#rateConfirmModal").modal("show");
}
async function submitRating(sku, rating) {
  const normalizedSku = String(sku || "").trim();
  if (!normalizedSku) return;

  if (ratedSkus.has(normalizedSku)) {
    toast(
      "Rating",
      "You already rated this product. You can only rate once.",
      "error"
    );
    return;
  }

  if (!RATING_CONTEXT.is_authenticated) {
    toast("Rating", "Please log in to rate products.", "error");
    if (RATING_CONTEXT.login_url) {
      setTimeout(() => {
        window.location.href = RATING_CONTEXT.login_url;
      }, 300);
    }
    return;
  }

  if (!RATING_CONTEXT.can_rate) {
    toast("Rating", "Only registered accounts can rate products.", "error");
    return;
  }

  const value = Math.trunc(toNumber(rating, 0));
  if (value < 1 || value > 5) {
    toast("Rating", "Please select a rating from 1 to 5.", "error");
    return;
  }

  const url = buildRateUrl(normalizedSku);
  if (!url) {
    toast("Rating", "Rating endpoint is not configured.", "error");
    return;
  }

  const product = bySku(normalizedSku);
  const isOwnProduct =
    !!product &&
    Number(product.owner_id || 0) > 0 &&
    Number(product.owner_id || 0) === Number(RATING_CONTEXT.current_user_id || 0);
  if (isOwnProduct) {
    toast("Rating", "You cannot rate your own product.", "error");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ rating: value }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 409) {
        ratedSkus.add(normalizedSku);
        saveRatedSkus();
      }
      throw new Error(data.error || "Could not submit rating.");
    }

    ratedSkus.add(normalizedSku);
    ratedSkuValues[normalizedSku] = value;
    saveRatedSkus();
    saveRatedSkuValues();
    updateProductRatingValue(normalizedSku, data.rating, data.reviews);

    renderProducts(view);
    const product = bySku(normalizedSku);
    if (product) {
      $("#qvRating").html(
        stars(product.rating) +
          ' <span class="muted small ml-1">' +
          product.rating.toFixed(1) +
          " (" +
          product.reviews +
          ")</span>"
      );
    }

    toast("Rating", data.message || "Thanks for your rating.");
  } catch (error) {
    toast("Rating", error.message || "Could not submit rating.", "error");
  }
}
async function submitContactMessageForm(form) {
  if (typeof $ !== "undefined" && typeof $.fn.parsley !== "undefined") {
    const parsleyInstance = $(form).parsley();
    if (!parsleyInstance.validate()) {
      return;
    }
  }

  const submitUrl = String($(form).data("submit-url") || "").trim();
  if (!submitUrl) {
    toast("Contact", "Contact endpoint is not configured.", "error");
    return;
  }

  const submitBtn = $("#contactUsSubmitBtn");
  const payload = {
    name: String($(form).find('[name="name"]').val() || "").trim(),
    email: String($(form).find('[name="email"]').val() || "").trim(),
    subject: String($(form).find('[name="subject"]').val() || "").trim(),
    message_body: String($(form).find('[name="message_body"]').val() || "").trim(),
  };

  if (!payload.name || !payload.email || !payload.subject || !payload.message_body) {
    toast("Contact", "All fields are required.", "error");
    return;
  }

  submitBtn.prop("disabled", true);
  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Unable to submit your message.");
    }

    const contactModal = $("#contactUsModal");
    if (contactModal.length) {
      contactModal.modal("hide");
    }
    form.reset();
    toast("Contact", data.message || "Message submitted successfully.");
  } catch (error) {
    toast("Contact", error.message || "Unable to submit your message.", "error");
  } finally {
    submitBtn.prop("disabled", false);
  }
}

function toast(title, body, variant = "info") {
  const text = `${title}: ${body}`;
  const isError = variant === "error";
  if (typeof Toastify !== "undefined") {
    Toastify({
      text,
      duration: 2400,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      close: true,
      className: isError
        ? "toastify-center-bottom toastify-error"
        : "toastify-center-bottom",
      style: {
        background: isError ? "#b42318" : "#088c16",
        color: "#f8fafc",
        borderRadius: "12px",
      },
    }).showToast();
    return;
  }
  console.warn("Toastify is not loaded:", text);
}

function updateSavedVehicleBadge() {
  if (savedVehicle && savedVehicle.make && savedVehicle.year) {
    $("#savedVehicle")
      .removeClass("d-none")
      .text(`Saved vehicle: ${savedVehicle.make} ${savedVehicle.year}`);
  } else {
    $("#savedVehicle").removeClass("d-none").text("No vehicle saved");
  }
}

// ==========================
// SEARCH SUGGESTIONS
// ==========================
function buildSuggestions(q) {
  const box = $("#suggestBox");
  box.empty();
  if (!q) {
    box.hide();
    return;
  }

  const hits = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.oem || "").toLowerCase().includes(q)
  ).slice(0, 6);

  if (hits.length === 0) {
    box.hide();
    return;
  }

  hits.forEach((p) => {
    box.append(`
          <div class="item" onclick="openQuickView('${p.sku}')">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="font-weight-bold">${escapeHtml(p.name)}</div>
                <div class="muted small">${escapeHtml(p.brand)} • ${escapeHtml(
      p.category
    )} • SKU: ${escapeHtml(p.sku)}</div>
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
  const grid = $("#productGrid");
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
  const grid = $("#productGrid");
  grid.empty();

  items.forEach((p, i) => {
    const delay = (i % 6) * 60;
    const badgeHtml = (p.badges || [])
      .slice(0, 2)
      .map((b) => {
        const cls =
          b === "Limited"
            ? "badge badge-danger"
            : b === "Top Rated"
            ? "badge badge-success"
            : b === "Best Seller"
            ? "badge badge-warning"
            : b === "Low Stock"
            ? "badge badge-warning"
            : b === "Bundle"
            ? "badge badge-soft"
            : "badge badge-soft";
        return `<span class="${cls}">${escapeHtml(b)}</span>`;
      })
      .join("");

    const wishOn = wish.includes(p.sku);
    const compOn = compare.includes(p.sku);
    const sellerName = p.seller_name || p.brand || "Unknown Seller";
    const sellerPhoto = p.seller_photo || sellerAvatarDataUri(sellerName);

    const fitHint =
      savedVehicle && savedVehicle.make
        ? `<span class="badge badge-ghost ml-2">Fitment: saved</span>`
        : ``;

    grid.append(`
          <div class="col-sm-6 col-lg-3 mb-4" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="product-card">
              <div class="p-img">
                <img src="${p.img}" alt="${escapeHtml(p.name)}">
                <div class="p-badges">${badgeHtml}</div>
                <div class="p-actions">
                  <div class="icon-btn" title="Quick view" onclick="openQuickView('${
                    p.sku
                  }')">
                    <i class="fas fa-eye"></i>
                  </div>
                  <div class="icon-btn" title="Compare" onclick="addToCartBySku('${
                    p.sku
                  }')">
                    <i class="fas fa-shopping-cart"></i>
                  </div>
                </div>
              </div>

              <div class="p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div style="min-width:0">
                    <div class="muted small"><b class="text-success">Category:</b> ${escapeHtml(
                      p.category
                    )} ${fitHint}</div>
                    <div class="font-weight-bold text-truncate">${escapeHtml(
                      p.name
                    )}</div>
                  </div>
                  <div class="text-right">
                    <div class="price">${money(p.price)}</div>
                    <div class="muted small">Stock: <b>${p.stock}</b></div>
                  </div>
                </div>

                <div class="d-flex align-items-center justify-content-between mt-2">
                  <div class="rating">${stars(
                    p.rating
                  )} <span class="muted small ml-1">${p.rating.toFixed(1)} (${
      p.reviews
    })</span></div>
                  <div class="ml-2">
                    ${
                      Number(p.owner_id || 0) > 0 &&
                      Number(p.owner_id || 0) === Number(RATING_CONTEXT.current_user_id || 0)
                        ? '<span class="muted small">Own product</span>'
                        : ratedSkus.has(String(p.sku || "").trim())
                        ? ratedStateHtml(String(p.sku || "").trim())
                        : RATING_CONTEXT.can_rate
                        ? openRateNowLinkHtml(p.sku)
                        : ""
                    }
                  </div>
                </div>

                <div class="muted small mt-2" style="min-height:42px">
                  ${escapeHtml(truncateWords(p.desc, 12))}
                </div>

                <div class="mt-3 muted small">
                    <div class="seller-mini mt-1">
                      <img class="seller-avatar" src="${escapeHtml(
                        sellerPhoto
                      )}" alt="${escapeHtml(sellerName)} profile">
                      <span class="name text-truncate">${escapeHtml(
                        sellerName
                      )}</span>
                      <span class="verify" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                          <path fill="#18A7E0" d="M12 1.8l2.18 1.57 2.64-.45 1.57 2.18 2.61.62.45 2.64 2.18 1.57-.62 2.61.62 2.61-2.18 1.57-.45 2.64-2.61.62-1.57 2.18-2.64-.45L12 22.2l-2.18-1.57-2.64.45-1.57-2.18-2.61-.62-.45-2.64L.37 14.07.99 11.46.37 8.85l2.18-1.57.45-2.64 2.61-.62 1.57-2.18 2.64.45L12 1.8z"></path>
                          <path fill="#fff" d="M10.2 15.9l-3-3 1.4-1.4 1.6 1.6 5.2-5.2 1.4 1.4-6.6 6.6z"></path>
                        </svg>
                      </span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        `);
  });

  $("#resultCount").text(items.length);
  if (window.AOS) AOS.refresh();
}

// ==========================
// QUICK VIEW
// ==========================
function openQuickView(sku) {
  const p = bySku(sku);
  if (!p) return;

  $("#qvTitle").text(p.name);
  $("#qvImg").attr("src", p.img);
  $("#qvPrice").text(money(p.price));
  $("#qvDesc").text(p.desc);
  $("#qvSku").text(p.sku);
  $("#qvSellerName").text(p.seller_name || p.brand || "Unknown Seller");
  $("#qvSellerPhoto")
    .attr(
      "src",
      p.seller_photo || sellerAvatarDataUri(p.seller_name || p.brand)
    )
    .attr("alt", (p.seller_name || p.brand || "Seller") + " profile");
  $("#qvCategory").text(p.category || "�");
  $("#qvCondition").text(p.condition || "�");
  $("#qvSeller").text(p.seller_name || p.brand || "�");
  $("#qvOem").text(p.oem || "�");
  $("#qvStock").text(p.stock);
  $("#qvMeta").text(
    p.brand +
      " - " +
      p.category +
      " - Condition: " +
      p.condition +
      " - Stock: " +
      p.stock
  );
  $("#qvRating").html(
    stars(p.rating) +
      ' <span class="muted small ml-1">' +
      p.rating.toFixed(1) +
      " (" +
      p.reviews +
      ")</span>"
  );
  renderQuickViewRateControls(p.sku);

  $("#qvFitBadge").text(savedVehicle ? "Vehicle saved" : "Not checked");

  $("#qvAdd")
    .off("click")
    .on("click", () => addToCartBySku(p.sku));
  $("#qvWish")
    .off("click")
    .on("click", () => toggleWish(p.sku));
  $("#qvCompare")
    .off("click")
    .on("click", () => toggleCompare(p.sku));

  $("#quickView").modal("show");
}
// ==========================
// WISHLIST / COMPARE
// ==========================
function toggleWish(sku) {
  if (wish.includes(sku)) wish = wish.filter((x) => x !== sku);
  else wish.push(sku);
  saveLS(LS.wish, wish);
  toast(
    "Wishlist",
    wish.includes(sku) ? "Added to wishlist." : "Removed from wishlist."
  );
  applyAll(false);
}

function toggleCompare(sku) {
  if (compare.includes(sku)) {
    compare = compare.filter((x) => x !== sku);
  } else {
    if (compare.length >= 3) {
      toast("Compare", "You can compare up to 3 items.");
      return;
    }
    compare.push(sku);
  }
  saveLS(LS.compare, compare);
  renderCompareUI();
  applyAll(false);
  toast(
    "Compare",
    compare.includes(sku) ? "Added to compare." : "Removed from compare."
  );
}

function clearCompare() {
  compare = [];
  saveLS(LS.compare, compare);
  renderCompareUI();
  toast("Compare", "Cleared.");
}

function renderCompareUI() {
  $("#compareCount").text(compare.length);
  $("#dockCount").text(compare.length);
  $("#compareDock").toggle(compare.length > 0);

  // headers
  const cols = [compare[0], compare[1], compare[2]].map((sku) => bySku(sku));
  $("#c1").text(cols[0]?.name || "—");
  $("#c2").text(cols[1]?.name || "—");
  $("#c3").text(cols[2]?.name || "—");

  // table
  const rows = [
    { k: "SKU", v: (p) => p?.sku || "—" },
    { k: "Brand", v: (p) => p?.brand || "—" },
    { k: "Category", v: (p) => p?.category || "—" },
    { k: "OEM", v: (p) => p?.oem || "—" },
    { k: "Condition", v: (p) => p?.condition || "—" },
    {
      k: "Rating",
      v: (p) => (p ? `${p.rating.toFixed(1)} (${p.reviews})` : "—"),
    },
    { k: "Price", v: (p) => (p ? money(p.price) : "—") },
    { k: "Stock", v: (p) => (p ? String(p.stock) : "—") },
  ];

  const tbody = $("#compareTable");
  tbody.empty();
  rows.forEach((r) => {
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
  const item = cart.find((x) => x.sku === sku);
  if (item) {
    if (item.qty >= p.stock) {
      toast("Stock", `Only ${p.stock} available for ${p.name}.`, "error");
      return;
    }
    item.qty += 1;
  } else {
    cart.push({ sku, qty: 1 });
  }
  saveLS(LS.cart, cart);
  toast("Cart", `${p.name} added.`);
  renderCartBadge();
  renderCartTable();
}

function removeFromCart(sku) {
  cart = cart.filter((x) => x.sku !== sku);
  saveLS(LS.cart, cart);
  renderCartBadge();
  renderCartTable();
}

function setQty(sku, qty) {
  const p = bySku(sku);
  const item = cart.find((x) => x.sku === sku);
  if (!p || !item) return;
  const requestedQty = Math.max(1, Number(qty) || 1);
  if (requestedQty > p.stock) {
    item.qty = p.stock;
    toast("Stock", `Only ${p.stock} available for ${p.name}.`, "error");
  } else {
    item.qty = requestedQty;
  }
  saveLS(LS.cart, cart);
  renderCartBadge();
  renderCartTable();
}

function clearCart() {
  cart = [];
  saveLS(LS.cart, cart);
  renderCartBadge();
  renderCartTable();
}

function renderCartBadge() {
  const count = cart.reduce((acc, x) => acc + x.qty, 0);
  $("#cartCount").text(count);
}

function renderCartTable() {
  const tbody = $("#cartTable");
  if (!tbody.length) return;
  tbody.empty();

  if (PRODUCTS.length > 0) {
    const previousCount = cart.length;
    cart = cart.filter((item) => !!bySku(item.sku));
    if (cart.length !== previousCount) {
      saveLS(LS.cart, cart);
    }
  }

  let subtotal = 0;
  cart.forEach((item) => {
    const p = bySku(item.sku);
    if (!p) {
      tbody.append(`
          <tr class="cart-row">
            <td class="ps-3">Unknown seller</td>
            <td>
              <div class="cart-item-name">Unknown product</div>
              <div class="small"><span class="kbd">VIN: ${escapeHtml(item.sku || "-")}</span></div>
            </td>
            <td class="text-end fw-semibold">-</td>
            <td class="text-center">${Math.max(1, Number(item.qty) || 1)}</td>
            <td class="text-end fw-semibold">-</td>
            <td class="text-end pe-3">
              <button class="btn btn-outline-light btn-sm cart-remove-btn" onclick="removeFromCart('${escapeHtml(
                item.sku || ""
              )}')" aria-label="Remove item from cart">
                <i class="fas fa-times"></i>
              </button>
            </td>
          </tr>
        `);
      return;
    }
    const line = p.price * item.qty;
    subtotal += line;

    tbody.append(`
          <tr class="cart-row">
            <td class="ps-3">
              <div class="cart-seller-inline">
                <img
                  class="cart-seller-avatar"
                  src="${escapeHtml(
                    p.seller_photo ||
                      sellerAvatarDataUri(p.seller_name || p.brand || "S")
                  )}"
                  alt="${escapeHtml(
                    p.seller_name || p.brand || "Seller"
                  )} profile">
                <div class="cart-seller-name-wrap">
                  <div class="cart-seller-name d-flex align-items-center">
                    ${escapeHtml(p.seller_name || p.brand || "Unknown Seller")}
                    <span class="ml-1 d-inline-flex align-items-center" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path fill="#18A7E0" d="M12 1.8l2.18 1.57 2.64-.45 1.57 2.18 2.61.62.45 2.64 2.18 1.57-.62 2.61.62 2.61-2.18 1.57-.45 2.64-2.61.62-1.57 2.18-2.64-.45L12 22.2l-2.18-1.57-2.64.45-1.57-2.18-2.61-.62-.45-2.64L.37 14.07.99 11.46.37 8.85l2.18-1.57.45-2.64 2.61-.62 1.57-2.18 2.64.45L12 1.8z"></path>
                        <path fill="#fff" d="M10.2 15.9l-3-3 1.4-1.4 1.6 1.6 5.2-5.2 1.4 1.4-6.6 6.6z"></path>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="cart-item-name">${escapeHtml(p.name)}</div>
              <div class="small"><span class="kbd">VIN: ${escapeHtml(
                p.sku
              )}</span></div>
            </td>
            <td class="text-end fw-semibold">${money(p.price)}</td>
            <td class="text-center">
              <input type="number" min="1" value="${
                item.qty
              }" class="form-control form-control-sm cart-qty-input"
                     onchange="setQty('${
                       p.sku
                     }', parseInt(this.value||'1',10))">
            </td>
            <td class="text-end fw-semibold">${money(line)}</td>
            <td class="text-end pe-3">
              <button class="btn btn-outline-light btn-sm cart-remove-btn" onclick="removeFromCart('${
                p.sku
              }')" aria-label="Remove ${escapeHtml(p.name)} from cart">
                <i class="fas fa-times"></i>
              </button>
            </td>
          </tr>
        `);
  });

  if (cart.length === 0) {
    tbody.append(
      `<tr><td colspan="6" class="text-center muted py-4">Your cart is empty.</td></tr>`
    );
  }

  $("#cartSubtotal").text(money(subtotal));
}

async function submitOrder() {
  if (!cart.length) {
    toast("Order", "Your cart is empty.", "error");
    return;
  }

  const submitBtn = $("#submitOrderBtn");
  const url = submitBtn.data("order-url");
  if (!url) {
    toast("Order", "Order endpoint is not configured.", "error");
    return;
  }

  const items = cart.map((item) => ({
    sku: item.sku,
    qty: Math.max(1, Number(item.qty) || 1),
  }));

  submitBtn.prop("disabled", true);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ items }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401 && data.login_url) {
        toast("Order", data.error || "Please log in first.", "error");
        window.location.href = data.login_url;
        return;
      }
      const details = Array.isArray(data.details) ? ` ${data.details.join(" ")}` : "";
      throw new Error((data.error || "Could not submit order.") + details);
    }

    toast("Order", data.message || "Order submitted successfully.");
    clearCart();
    $("#cartModal").modal("hide");
  } catch (error) {
    toast("Order", error.message || "Could not submit order.", "error");
  } finally {
    submitBtn.prop("disabled", false);
  }
}

// ==========================
// FILTERS + SEARCH
// ==========================
function applyAll(showToast = true) {
  const q = ($("#q").val() || "").trim().toLowerCase();

  const cat = $("#filterCategory").val() || "All";
  const brand = $("#filterBrand").val() || "All";
  const min = parseFloat($("#minPrice").val());
  const max = parseFloat($("#maxPrice").val());

  const allowNew = $("#condNew").is(":checked");
  const allowRefurb = $("#condRefurb").is(":checked");

  const ratingMin = $("#r45").is(":checked")
    ? 4.5
    : $("#r4").is(":checked")
    ? 4.0
    : 0;
  const stockMode = $("#filterStock").val() || "All";

  view = PRODUCTS.filter((p) => {
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.oem || "").toLowerCase().includes(q);

    const matchCat = cat === "All" || p.category === cat;
    const matchBrand = brand === "All" || p.brand === brand;

    const matchMin = Number.isFinite(min) ? p.price >= min : true;
    const matchMax = Number.isFinite(max) ? p.price <= max : true;

    const matchCond =
      (allowNew && p.condition === "New") ||
      (allowRefurb && p.condition === "Refurbished");

    const matchRating = p.rating >= ratingMin;

    const matchStock =
      stockMode === "All" ||
      (stockMode === "In" && p.stock > 0) ||
      (stockMode === "Low" && p.stock > 0 && p.stock <= 5);

    return (
      matchQ &&
      matchCat &&
      matchBrand &&
      matchMin &&
      matchMax &&
      matchCond &&
      matchRating &&
      matchStock
    );
  });

  // sort
  const sortBy = $("#sortBy").val();
  if (sortBy === "priceAsc") view.sort((a, b) => a.price - b.price);
  if (sortBy === "priceDesc") view.sort((a, b) => b.price - a.price);
  if (sortBy === "ratingDesc") view.sort((a, b) => b.rating - a.rating);
  if (sortBy === "stockDesc") view.sort((a, b) => b.stock - a.stock);

  // active filters count
  let active = 0;
  if (q) active++;
  if (cat !== "All") active++;
  if (brand !== "All") active++;
  if (Number.isFinite(min) || Number.isFinite(max)) active++;
  if (!allowNew || allowRefurb) active++;
  if (ratingMin > 0) active++;
  if (stockMode !== "All") active++;

  $("#activeFilters").text(active);

  renderProducts(view);

  if (showToast) toast("Filters", `Applied • ${active} active`);
}

function resetAll() {
  $("#q").val("");
  $("#filterCategory").val("All");
  $("#filterBrand").val("All");
  $("#minPrice").val("");
  $("#maxPrice").val("");
  $("#condNew").prop("checked", true);
  $("#condRefurb").prop("checked", false);
  $("#rAll").prop("checked", true);
  $("#filterStock").val("All");
  $("#sortBy").val("relevance");

  $(".chip").removeClass("active");
  $('.chip[data-chip="All"]').addClass("active");

  view = [...PRODUCTS];
  $("#activeFilters").text(0);
  renderProducts(view);
}

// ==========================
// FITMENT (inline)
// ==========================
function renderFitmentRecs() {
  const box = $("#fitmentRecs");
  box.empty();

  // lightweight “recommendations”
  const recs = PRODUCTS.slice(0, 4);
  recs.forEach((p) => {
    box.append(`
          <div class="col-sm-6 mb-3">
            <div class="panel" style="background:var(--glass2)">
              <div class="panel-b">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="font-weight-bold">${escapeHtml(p.name)}</div>
                  <div class="font-weight-bold">${money(p.price)}</div>
                </div>
                <div class="muted small">${escapeHtml(p.brand)} • ${escapeHtml(
      p.category
    )} • OEM: ${escapeHtml(p.oem || "—")}</div>
                <div class="d-flex mt-2">
                  <button class="btn btn-success btn-sm btn-block mr-2" onclick="addToCartBySku('${
                    p.sku
                  }')"><i class="fas fa-cart-plus mr-1"></i>Add</button>
                  <button class="btn btn-outline-light btn-sm btn-block" onclick="openQuickView('${
                    p.sku
                  }')">Details</button>
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
  $("#wizStep").text(wiz.step);
  $("#wizProg").css("width", wiz.step * 33.33 + "%");

  const body = $("#wizBody");
  body.empty();

  if (wiz.step === 1) {
    $("#wizHint").text("Select a Make");
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
    $("#wizMake").val(wiz.make);
  }

  if (wiz.step === 2) {
    $("#wizHint").text("Pick Year");
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
    $("#wizYear").val(wiz.year);
  }

  if (wiz.step === 3) {
    $("#wizHint").text("Confirm & Save");
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
                  <div class="font-weight-bold" id="wizSummaryMake">${escapeHtml(
                    wiz.make || "—"
                  )}</div>
                </div>
                <div class="col-md-6 mb-2">
                  <div class="muted small">Year</div>
                  <div class="font-weight-bold" id="wizSummaryYear">${escapeHtml(
                    wiz.year || "—"
                  )}</div>
                </div>
              </div>

              <button class="btn btn-success btn-block mt-3" id="wizSave">
                <i class="fas fa-save mr-2"></i>Save Vehicle Profile
              </button>
            </div>
          </div>
        `);

    $("#wizSave").on("click", () => {
      if (!wiz.make || !wiz.year) {
        toast("Fitment", "Please complete steps 1 and 2.");
        return;
      }
      savedVehicle = { make: wiz.make, year: wiz.year };
      saveLS(LS.vehicle, savedVehicle);
      updateSavedVehicleBadge();
      $("#fitmentBadge")
        .text("Vehicle saved")
        .removeClass("badge-soft")
        .addClass("badge badge-success");
      toast("Fitment", `Saved: ${wiz.make} ${wiz.year}`);
      $("#fitmentWizard").modal("hide");
      applyAll(false);
    });
  }

  $("#wizBack").prop("disabled", wiz.step === 1);
  $("#wizNext").text(wiz.step === 3 ? "Finish" : "Next");
}

// ==========================
// EVENTS
// ==========================
$(function () {
  if (window.AOS) {
    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      offset: 80,
      once: true,
    });
  }

  // skeleton then render (gives “premium” feel)
  renderSkeletons(6);
  setTimeout(() => {
    resetAll();
  }, 350);

  // init UI
  renderCartBadge();
  renderCartTable();
  renderCompareUI();
  renderFitmentRecs();
  updateSavedVehicleBadge();

  // Fitment badge state
  if (savedVehicle)
    $("#fitmentBadge")
      .text("Vehicle saved")
      .removeClass("badge-soft")
      .addClass("badge badge-success");

  // Search / suggestions
  $("#q").on("input", function () {
    const q = ($(this).val() || "").trim().toLowerCase();
    buildSuggestions(q);
  });
  $(document).on("click", function (e) {
    if (!$(e.target).closest(".search-wrap").length) $("#suggestBox").hide();
  });

  $("#btnSearch").on("click", () => {
    $("#suggestBox").hide();
    applyAll(false);
    toast("Search", "Results updated.");
  });
  $("#btnVoice").on("click", () =>
    toast("Voice", "Voice search is UI-only in this template.")
  );

  // Filters
  $("#btnApply").on("click", () => applyAll(false));
  $("#btnReset").on("click", () => {
    resetAll();
    toast("Filters", "Reset complete.");
  });
  $("#btnReset2").on("click", () => {
    resetAll();
    toast("Filters", "Reset complete.");
  });
  $("#sortBy").on("change", () => applyAll(false));

  // Chips drive category
  $(".chip").on("click", function () {
    $(".chip").removeClass("active");
    $(this).addClass("active");
    const c = $(this).data("chip");
    $("#filterCategory").val(c === "All" ? "All" : c);
    applyAll(false);
  });

  // Deal button
  $("#btnDeal").on("click", () => {
    if (PRODUCTS.length > 0) {
      openQuickView(PRODUCTS[0].sku);
      return;
    }
    toast("Deals", "No products are available yet.");
  });

  // Fitment quick check
  $("#btnFitment").on("click", () => {
    const make = $("#make").val();
    const year = $("#year").val();
    const vin = ($("#vin").val() || "").trim();

    if (!vin && (!make || !year)) {
      toast("Fitment", "Enter VIN or select Make + Year (demo).");
      return;
    }
    const chosenMake = make || "VIN vehicle";
    const chosenYear = year || "—";

    savedVehicle = { make: chosenMake, year: chosenYear };
    saveLS(LS.vehicle, savedVehicle);
    updateSavedVehicleBadge();
    $("#fitmentBadge")
      .text("Vehicle saved")
      .removeClass("badge-soft")
      .addClass("badge badge-success");
    toast("Fitment", `Saved: ${chosenMake} ${chosenYear}`);
    applyAll(false);
  });

  // Wizard modal open
  $("#fitmentWizard").on("shown.bs.modal", () => {
    wiz = { step: 1, make: "", year: "", engine: "" };
    renderWizard();
  });

  $("#wizBack").on("click", () => {
    wiz.step = Math.max(1, wiz.step - 1);
    renderWizard();
  });

  $("#wizNext").on("click", () => {
    if (wiz.step === 1) {
      wiz.make = ($("#wizMake").val() || "").trim();
      if (!wiz.make) {
        toast("Wizard", "Pick a make first.");
        return;
      }
      wiz.step = 2;
      renderWizard();
      return;
    }
    if (wiz.step === 2) {
      wiz.year = ($("#wizYear").val() || "").trim();
      if (!wiz.year) {
        toast("Wizard", "Pick a year first.");
        return;
      }
      wiz.step = 3;
      renderWizard();
      return;
    }
    if (wiz.step === 3) {
      // Finish button handled by Save
      toast("Wizard", 'Press "Save Vehicle Profile" to finish.');
    }
  });

  // Hotkeys
  document.addEventListener("keydown", (e) => {
    const tag =
      (document.activeElement && document.activeElement.tagName) || "";
    const typing =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      document.activeElement?.isContentEditable;

    if (e.key === "/" && !typing) {
      e.preventDefault();
      $("#q").focus();
    }
    if (e.key === "Escape") {
      if (document.activeElement === document.getElementById("q")) {
        $("#q").val("");
        $("#suggestBox").hide();
        applyAll(false);
        toast("Search", "Cleared.");
      }
    }
    if ((e.key === "c" || e.key === "C") && !typing) {
      $("#cartModal").modal("show");
    }
  });

  $("#btnHotkey").on("click", () =>
    toast(
      "Hotkeys",
      'Press "/" for search • "C" for cart • Esc to clear search'
    )
  );

  // Load more demo
  $("#btnLoadMore").on("click", () =>
    toast("Demo", "Pagination is UI-only in this template.")
  );

  $(document).on("click", "#submitOrderBtn", function (e) {
    e.preventDefault();
    submitOrder();
  });

  $("#rateConfirmSubmit").on("click", function () {
    if (!pendingRatingConfirm) return;
    if (Math.trunc(toNumber(pendingRatingConfirm.rating, 0)) < 1) {
      toast("Rating", "Please choose a rating first.", "error");
      return;
    }
    const payload = { ...pendingRatingConfirm };
    pendingRatingConfirm = null;
    $("#rateConfirmModal").modal("hide");
    submitRating(payload.sku, payload.rating);
  });

  $(document).on("click", "#rateConfirmStars .rate-modal-star", function (e) {
    e.preventDefault();
    const selected = Math.trunc(toNumber($(this).data("rating"), 0));
    setModalSelectedRating(selected);
  });

  $("#rateConfirmModal").on("hidden.bs.modal", function () {
    pendingRatingConfirm = null;
  });

  $(document).on("submit", "#contactUsFormModal", function (e) {
    e.preventDefault();
    submitContactMessageForm(this);
  });

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
window.submitOrder = submitOrder;
window.submitRating = submitRating;
window.openRateModal = openRateModal;
