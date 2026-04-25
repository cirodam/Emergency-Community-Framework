// @ecf/community — entry point
// Bank interactions must go through HTTP client — never import @ecf/bank directly

export { Person } from "./person/Person.js";
export type { PersonCredential, LanguageProficiency } from "./person/Person.js";
export { PersonLoader } from "./person/PersonLoader.js";
export { PersonService } from "./person/PersonService.js";
export type { PersonPatch } from "./person/PersonService.js";

export { CommunityRole } from "./commons/CommunityRole.js";
export { CommunityRoleLoader } from "./commons/domain/CommunityRoleLoader.js";
export { FunctionalUnit } from "./commons/domain/FunctionalUnit.js";
export type { BankLike } from "./commons/domain/BankLike.js";
export { FunctionalDomain } from "./commons/domain/FunctionalDomain.js";
export type { BudgetLineItem, DomainBudget } from "./commons/domain/FunctionalDomain.js";
export { FunctionalUnitLoader } from "./commons/domain/FunctionalUnitLoader.js";
export { FunctionalDomainLoader } from "./commons/domain/FunctionalDomainLoader.js";
export { UnitTemplateRegistry } from "./commons/domain/UnitTemplateRegistry.js";

