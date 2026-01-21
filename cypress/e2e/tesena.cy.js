import { faker } from "@faker-js/faker";
describe("PrestaShop basic automated tests", () => {
  /**
   * T1 – Registration test (with Faker)
   * Creates a new user account using randomly generated data.
   *
   * Note: This may fail if the site uses CAPTCHA or email confirmation.
   */
  it("T1 Registration: user can create an account (faker data)", () => {
    // Generate realistic user data
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const password = faker.internet.password({ length: 12 });

    cy.visit("/");

    // Open login / account page (common in PrestaShop)
    cy.get(".user-info a").should("be.visible").click();

    // Open registration form
    cy.get(".no-account a").should("be.visible").click();

    // Fill the registration form
    cy.get("#field-id_gender-1").check({ force: true }); // Pan

    cy.get("#field-firstname").should("be.visible").type(firstName);

    cy.get("#field-lastname").should("be.visible").type(lastName);

    cy.get("#field-email").should("be.visible").type(email);

    cy.get("#field-password")
      .should("be.visible")
      .type(password, { log: false }); // hides password from Cypress logs

    // Agree to privacy policies
    cy.get('input[name="customer_privacy"][required]').check({ force: true });
    cy.get('input[name="psgdpr"][required]').check({ force: true });

    // Intercept registration submit (POST)
    cy.intercept("POST", "**/cs/registrace**").as("register");

    // Submit registration
    cy.get('button[data-link-action="save-customer"]')
      .should("be.visible")
      .click();

    // Wait for backend submit + redirect
    cy.wait("@register", { timeout: 2000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 302, 303]);

    // Wait until UI updates (user is logged in)
    cy.get(".user-info a", { timeout: 2000 })
      .should("be.visible")
      .and("contain.text", firstName);

    // Verify by visiting account page
    cy.get("a.account", { timeout: 2000 })
      .should("be.visible")
      .and("contain.text", firstName)
      .click();

    // Open personal information page
    cy.get("#identity-link", { timeout: 2000 }).should("be.visible").click();

    // Verify personal info
    cy.get("#field-id_gender-1").should("be.checked");
    cy.get("#field-id_gender-2").should("not.be.checked");
    cy.get("#field-firstname").should("have.value", firstName);
    cy.get("#field-lastname").should("have.value", lastName);
    cy.get("#field-email").should("have.value", email);
  });

  /**
   * T2 – Smoke test
   * Verifies that the homepage loads and basic UI elements are visible.
   */
  it("T2 Smoke: homepage loads and basic elements are visible", () => {
    cy.visit("/");

    // Correct language version
    cy.url().should("include", "/cs/");

    // Page and header are visible
    cy.get("body").should("be.visible");
    cy.get("header").should("be.visible");

    // Search input exists
    cy.get("#search_widget input").should("be.visible");
  });

  /**
   * T3 – Search test
   * Verifies that search works and shows product results.
   */
  it("T3 Search: searching for t-shirt shows results", () => {
    cy.visit("/");

    // Search for a known existing product
    cy.get("#search_widget input").should("be.visible").type("t-shirt{enter}");

    // We should be on the search page
    cy.url().should("include", "search");

    // At least one product should be displayed
    cy.get(".js-product").should("have.length.at.least", 1);
  });

  /**
   * T4 – Cart test
   * Verifies that a product can be added to cart and appears in the cart.
   */
  it("T4 Cart: add product to cart and verify it is in the cart", () => {
    cy.visit("/");

    cy.get(".featured-products .js-product")
      .should("have.length.at.least", 1)
      .first()
      .find("a.product-thumbnail")
      .should("be.visible")
      .click();

    cy.get("h1.h1").should("be.visible");

    // Intercepty PŘED klikem na Add to cart
    cy.intercept("POST", "**/cs/kosik").as("cartPost");
    cy.intercept("POST", "**/module/ps_shoppingcart/ajax").as("cartAjax");

    cy.get('[data-button-action="add-to-cart"]').should("be.visible").click();

    // Počkáme na oba requesty (PrestaShop často posílá oba)
    cy.wait("@cartPost", { timeout: 20000 })
      .its("response.statusCode")
      .should("be.oneOf", [200, 302, 303]);

    cy.wait("@cartAjax", { timeout: 20000 })
      .its("response.statusCode")
      .should("eq", 200);

    // Modal musí být vidět
    cy.get("#blockcart-modal").should("be.visible");

    // Klik na tlačítko "Pokračovat do pokladny" (přesně jak ho máš v HTML)
    cy.get('#blockcart-modal a.btn.btn-primary[href*="/cs/kosik?action=show"]')
      .should("be.visible")
      .click();

    // Ověř, že jsme na stránce košíku
    cy.location("href").should("include", "/cs/kosik?action=show");

    // Nejstabilnější ověření, že košík není prázdný
    cy.window()
      .its("prestashop.cart.products_count")
      .should("be.greaterThan", 0);

    // (Volitelné) DOM ověření položek – když stránka vykresluje seznam
    cy.get("ul.cart-items li.cart-item").should("have.length.at.least", 1);
  });
});
