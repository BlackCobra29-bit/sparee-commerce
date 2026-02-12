(function () {
  function initAuthUi() {
    setupParsley();
    setupPasswordToggles();
    setupStrengthMeter();
    setupEmailNormalizer();
    setupAccountTypeToggle();
  }

  function setupParsley() {
    if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.parsley || !window.Parsley) {
      return;
    }

    window.Parsley.addValidator("fileextension", {
      requirementType: "string",
      validateString: function (_value, requirement, parsleyInstance) {
        const file = parsleyInstance.$element[0]?.files?.[0];
        if (!file) return true;
        const allowed = requirement.split(",").map((x) => x.trim().toLowerCase());
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        return allowed.includes(ext);
      },
      messages: {
        en: "Allowed file types: %s.",
      },
    });

    window.Parsley.addValidator("maxfilesize", {
      requirementType: "integer",
      validateString: function (_value, maxSizeMb, parsleyInstance) {
        const file = parsleyInstance.$element[0]?.files?.[0];
        if (!file) return true;
        return file.size <= maxSizeMb * 1024 * 1024;
      },
      messages: {
        en: "File must be %sMB or smaller.",
      },
    });

    window.jQuery("form[data-parsley-validate]").parsley({
      errorsWrapper: '<ul class="parsley-errors-list"></ul>',
      errorTemplate: "<li></li>",
      trigger: "change input",
      validateIfEmpty: true,
    });
  }

  function setupPasswordToggles() {
    const buttons = document.querySelectorAll("[data-toggle-password]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", function () {
        const inputId = btn.getAttribute("data-target");
        const input = document.getElementById(inputId);
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
      });
    });
  }

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  function setupStrengthMeter() {
    const input = document.getElementById("password");
    const fill = document.getElementById("strengthFill");
    const label = document.getElementById("strengthLabel");
    if (!input || !fill || !label) return;

    input.addEventListener("input", function () {
      const score = scorePassword(input.value);
      const pct = (score / 5) * 100;
      fill.style.width = pct + "%";

      if (score <= 1) {
        fill.style.background = "#dc3545";
        label.textContent = "Weak";
      } else if (score <= 3) {
        fill.style.background = "#f1b806";
        label.textContent = "Medium";
      } else {
        fill.style.background = "#088c16";
        label.textContent = "Strong";
      }
    });
  }

  function setupEmailNormalizer() {
    const email = document.getElementById("email");
    if (!email) return;
    email.addEventListener("blur", function () {
      email.value = email.value.trim().toLowerCase();
    });
  }

  function setupAccountTypeToggle() {
    const accountType = document.getElementById("account_type");
    const licenseWrap = document.getElementById("licenseFieldWrap");
    const licenseInput = document.getElementById("license_file");
    if (!accountType || !licenseWrap || !licenseInput) return;

    function applyView() {
      const isSeller = accountType.value === "seller";
      const hasType = accountType.value === "buyer" || accountType.value === "seller";

      if (isSeller) {
        licenseWrap.classList.remove("is-hidden");
        licenseInput.disabled = false;
        licenseInput.setAttribute("required", "required");
      } else {
        licenseWrap.classList.add("is-hidden");
        licenseInput.value = "";
        licenseInput.disabled = true;
        licenseInput.removeAttribute("required");
      }

      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.parsley) {
        window.jQuery(licenseInput).parsley().reset();
        if (hasType) {
          window.jQuery(accountType).parsley().validate();
        }
      }
    }

    accountType.addEventListener("change", applyView);
    applyView();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAuthUi();
  });

  document.addEventListener("htmx:afterSwap", function (event) {
    const target = event.target;
    if (!target) return;
    if (target.id === "auth-page" || (target.closest && target.closest("#auth-page"))) {
      initAuthUi();
    }
  });
})();
