// @ecf/community — entry point
// Bank interactions must go through HTTP client — never import @ecf/bank directly

export { Person } from "./person/Person.js";
export type { PersonCredential, LanguageProficiency } from "./person/Person.js";
export { PersonLoader } from "./person/PersonLoader.js";
export { PersonService } from "./person/PersonService.js";
export type { PersonPatch } from "./person/PersonService.js";

export { CommunityRole } from "./common/CommunityRole.js";
export { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
export { FunctionalUnit } from "./common/domain/FunctionalUnit.js";
export type { BankLike } from "./common/domain/BankLike.js";
export { FunctionalDomain } from "./common/domain/FunctionalDomain.js";
export type { BudgetLineItem, DomainBudget } from "./common/domain/FunctionalDomain.js";
export { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
export { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
export { UnitTemplateRegistry } from "./common/domain/UnitTemplateRegistry.js";

export { LeaderPool } from "./governance/LeaderPool.js";
export { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";

