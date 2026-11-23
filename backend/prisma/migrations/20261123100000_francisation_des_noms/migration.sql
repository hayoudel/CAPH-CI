-- Francisation de la base : tables, clés étrangères, types énumérés. Aucune donnée n'est supprimée ni recopiée
-- (hors tables de liaison implicites : voir plus bas).

-- Fonctions temporaires : un renommage est ignoré si l'objet n'existe pas (base légèrement différente).
CREATE FUNCTION pg_temp.rc(t text, a text, b text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = a) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = b) THEN
    EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', t, a, b);
  END IF;
END $f$;
CREATE FUNCTION pg_temp.ri(a text, b text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = a) AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = b) THEN
    EXECUTE format('ALTER INDEX %I RENAME TO %I', a, b);
  END IF;
END $f$;

-- 1. Types énumérés
ALTER TYPE "EventType" RENAME TO "TypeEvenement";
ALTER TYPE "EventMode" RENAME TO "ModeEvenement";
ALTER TYPE "EventStatus" RENAME TO "StatutEvenement";
ALTER TYPE "ReportType" RENAME TO "TypeRapport";
ALTER TYPE "ReportStatus" RENAME TO "StatutRapport";
ALTER TYPE "InternalDocumentCategory" RENAME TO "CategorieDocument";

-- 2. Colonnes : clés étrangères en snake_case français (region_id, organisation_id…)
ALTER TABLE "delegations" RENAME COLUMN "regionId" TO "region_id";
ALTER TABLE "role_permissions" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "role_permissions" RENAME COLUMN "permissionId" TO "permission_id";
ALTER TABLE "user_roles" RENAME COLUMN "userId" TO "utilisateur_id";
ALTER TABLE "user_roles" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "user_roles" RENAME COLUMN "delegationId" TO "delegation_id";
ALTER TABLE "organization_members" RENAME COLUMN "userId" TO "utilisateur_id";
ALTER TABLE "organization_members" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "organization_members" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "refresh_tokens" RENAME COLUMN "userId" TO "utilisateur_id";
ALTER TABLE "one_time_tokens" RENAME COLUMN "userId" TO "utilisateur_id";
ALTER TABLE "organizations" RENAME COLUMN "delegationId" TO "delegation_id";
ALTER TABLE "organizations" RENAME COLUMN "regionId" TO "region_id";
ALTER TABLE "file_assets" RENAME COLUMN "uploadedById" TO "depose_par_id";
ALTER TABLE "membership_requests" RENAME COLUMN "categoryId" TO "categorie_id";
ALTER TABLE "membership_requests" RENAME COLUMN "delegationId" TO "delegation_id";
ALTER TABLE "membership_requests" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "membership_documents" RENAME COLUMN "requestId" TO "demande_id";
ALTER TABLE "membership_documents" RENAME COLUMN "fileId" TO "fichier_id";
ALTER TABLE "membership_documents" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "membership_events" RENAME COLUMN "requestId" TO "demande_id";
ALTER TABLE "membership_events" RENAME COLUMN "actorId" TO "acteur_id";
ALTER TABLE "membership_decisions" RENAME COLUMN "requestId" TO "demande_id";
ALTER TABLE "membership_decisions" RENAME COLUMN "recordedById" TO "enregistre_par_id";
ALTER TABLE "payment_records" RENAME COLUMN "requestId" TO "demande_id";
ALTER TABLE "payment_records" RENAME COLUMN "recordedById" TO "enregistre_par_id";
ALTER TABLE "internal_documents" RENAME COLUMN "fileId" TO "fichier_id";
ALTER TABLE "internal_documents" RENAME COLUMN "createdById" TO "cree_par_id";
ALTER TABLE "internal_documents" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "internal_documents" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "opportunities" RENAME COLUMN "sheetFileId" TO "fichier_fiche_id";
ALTER TABLE "opportunities" RENAME COLUMN "createdById" TO "cree_par_id";
ALTER TABLE "opportunities" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "opportunities" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "communications" RENAME COLUMN "createdById" TO "cree_par_id";
ALTER TABLE "communication_reads" RENAME COLUMN "communicationId" TO "communication_id";
ALTER TABLE "communication_reads" RENAME COLUMN "userId" TO "utilisateur_id";
ALTER TABLE "events" RENAME COLUMN "regionId" TO "region_id";
ALTER TABLE "events" RENAME COLUMN "createdById" TO "cree_par_id";
ALTER TABLE "events" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "events" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "reports" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "reports" RENAME COLUMN "authorId" TO "auteur_id";
ALTER TABLE "reports" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "report_attachments" RENAME COLUMN "reportId" TO "rapport_id";
ALTER TABLE "report_attachments" RENAME COLUMN "fileId" TO "fichier_id";
ALTER TABLE "news_proposals" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "news_proposals" RENAME COLUMN "authorId" TO "auteur_id";
ALTER TABLE "news_proposals" RENAME COLUMN "categoryId" TO "categorie_id";
ALTER TABLE "news_proposals" RENAME COLUMN "coverFileId" TO "fichier_couverture_id";
ALTER TABLE "news_proposals" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "news_status_history" RENAME COLUMN "proposalId" TO "actualite_id";
ALTER TABLE "news_status_history" RENAME COLUMN "actorId" TO "acteur_id";
ALTER TABLE "news_attachments" RENAME COLUMN "proposalId" TO "actualite_id";
ALTER TABLE "news_attachments" RENAME COLUMN "fileId" TO "fichier_id";
ALTER TABLE "projects" RENAME COLUMN "organizationId" TO "organisation_id";
ALTER TABLE "projects" RENAME COLUMN "authorId" TO "auteur_id";
ALTER TABLE "projects" RENAME COLUMN "coverFileId" TO "fichier_couverture_id";
ALTER TABLE "projects" RENAME COLUMN "reviewedById" TO "valide_par_id";
ALTER TABLE "project_attachments" RENAME COLUMN "projectId" TO "projet_id";
ALTER TABLE "project_attachments" RENAME COLUMN "fileId" TO "fichier_id";
ALTER TABLE "project_status_history" RENAME COLUMN "projectId" TO "projet_id";
ALTER TABLE "project_status_history" RENAME COLUMN "actorId" TO "acteur_id";

-- 3. Tables
ALTER TABLE "intervention_domains" RENAME TO "domaines_intervention";
ALTER TABLE "disability_types" RENAME TO "types_handicap";
ALTER TABLE "news_categories" RENAME TO "categories_actualites";
ALTER TABLE "users" RENAME TO "utilisateurs";
ALTER TABLE "role_permissions" RENAME TO "roles_permissions";
ALTER TABLE "user_roles" RENAME TO "roles_utilisateurs";
ALTER TABLE "organization_members" RENAME TO "membres_organisation";
ALTER TABLE "refresh_tokens" RENAME TO "jetons_actualisation";
ALTER TABLE "one_time_tokens" RENAME TO "jetons_usage_unique";
ALTER TABLE "organizations" RENAME TO "organisations";
ALTER TABLE "membership_categories" RENAME TO "categories_adhesion";
ALTER TABLE "fee_schedules" RENAME TO "baremes_cotisations";
ALTER TABLE "reference_counters" RENAME TO "compteurs_reference";
ALTER TABLE "file_assets" RENAME TO "fichiers";
ALTER TABLE "membership_requests" RENAME TO "demandes_adhesion";
ALTER TABLE "membership_documents" RENAME TO "documents_adhesion";
ALTER TABLE "membership_events" RENAME TO "evenements_adhesion";
ALTER TABLE "membership_decisions" RENAME TO "decisions_adhesion";
ALTER TABLE "payment_records" RENAME TO "paiements_adhesion";
ALTER TABLE "internal_documents" RENAME TO "documents";
ALTER TABLE "opportunities" RENAME TO "opportunites";
ALTER TABLE "communication_reads" RENAME TO "communications_lues";
ALTER TABLE "events" RENAME TO "evenements";
ALTER TABLE "reports" RENAME TO "rapports";
ALTER TABLE "report_attachments" RENAME TO "rapports_pieces_jointes";
ALTER TABLE "news_proposals" RENAME TO "actualites";
ALTER TABLE "news_status_history" RENAME TO "actualites_historique";
ALTER TABLE "news_attachments" RENAME TO "actualites_pieces_jointes";
ALTER TABLE "projects" RENAME TO "projets";
ALTER TABLE "project_attachments" RENAME TO "projets_pieces_jointes";
ALTER TABLE "project_status_history" RENAME TO "projets_historique";

-- 4. Contraintes et index : on garde les noms par défaut attendus par Prisma
SELECT pg_temp.rc('domaines_intervention', 'intervention_domains_pkey', 'domaines_intervention_pkey');
SELECT pg_temp.rc('types_handicap', 'disability_types_pkey', 'types_handicap_pkey');
SELECT pg_temp.rc('categories_actualites', 'news_categories_pkey', 'categories_actualites_pkey');
SELECT pg_temp.rc('utilisateurs', 'users_pkey', 'utilisateurs_pkey');
SELECT pg_temp.rc('roles_permissions', 'role_permissions_pkey', 'roles_permissions_pkey');
SELECT pg_temp.rc('roles_utilisateurs', 'user_roles_pkey', 'roles_utilisateurs_pkey');
SELECT pg_temp.rc('membres_organisation', 'organization_members_pkey', 'membres_organisation_pkey');
SELECT pg_temp.rc('jetons_actualisation', 'refresh_tokens_pkey', 'jetons_actualisation_pkey');
SELECT pg_temp.rc('jetons_usage_unique', 'one_time_tokens_pkey', 'jetons_usage_unique_pkey');
SELECT pg_temp.rc('organisations', 'organizations_pkey', 'organisations_pkey');
SELECT pg_temp.rc('categories_adhesion', 'membership_categories_pkey', 'categories_adhesion_pkey');
SELECT pg_temp.rc('baremes_cotisations', 'fee_schedules_pkey', 'baremes_cotisations_pkey');
SELECT pg_temp.rc('compteurs_reference', 'reference_counters_pkey', 'compteurs_reference_pkey');
SELECT pg_temp.rc('fichiers', 'file_assets_pkey', 'fichiers_pkey');
SELECT pg_temp.rc('demandes_adhesion', 'membership_requests_pkey', 'demandes_adhesion_pkey');
SELECT pg_temp.rc('documents_adhesion', 'membership_documents_pkey', 'documents_adhesion_pkey');
SELECT pg_temp.rc('evenements_adhesion', 'membership_events_pkey', 'evenements_adhesion_pkey');
SELECT pg_temp.rc('decisions_adhesion', 'membership_decisions_pkey', 'decisions_adhesion_pkey');
SELECT pg_temp.rc('paiements_adhesion', 'payment_records_pkey', 'paiements_adhesion_pkey');
SELECT pg_temp.rc('documents', 'internal_documents_pkey', 'documents_pkey');
SELECT pg_temp.rc('opportunites', 'opportunities_pkey', 'opportunites_pkey');
SELECT pg_temp.rc('communications_lues', 'communication_reads_pkey', 'communications_lues_pkey');
SELECT pg_temp.rc('evenements', 'events_pkey', 'evenements_pkey');
SELECT pg_temp.rc('rapports', 'reports_pkey', 'rapports_pkey');
SELECT pg_temp.rc('rapports_pieces_jointes', 'report_attachments_pkey', 'rapports_pieces_jointes_pkey');
SELECT pg_temp.rc('actualites', 'news_proposals_pkey', 'actualites_pkey');
SELECT pg_temp.rc('actualites_historique', 'news_status_history_pkey', 'actualites_historique_pkey');
SELECT pg_temp.rc('actualites_pieces_jointes', 'news_attachments_pkey', 'actualites_pieces_jointes_pkey');
SELECT pg_temp.rc('projets', 'projects_pkey', 'projets_pkey');
SELECT pg_temp.rc('projets_pieces_jointes', 'project_attachments_pkey', 'projets_pieces_jointes_pkey');
SELECT pg_temp.rc('projets_historique', 'project_status_history_pkey', 'projets_historique_pkey');
SELECT pg_temp.rc('delegations', 'delegations_regionId_fkey', 'delegations_region_id_fkey');
SELECT pg_temp.rc('roles_permissions', 'role_permissions_roleId_fkey', 'roles_permissions_role_id_fkey');
SELECT pg_temp.rc('roles_permissions', 'role_permissions_permissionId_fkey', 'roles_permissions_permission_id_fkey');
SELECT pg_temp.rc('roles_utilisateurs', 'user_roles_userId_fkey', 'roles_utilisateurs_utilisateur_id_fkey');
SELECT pg_temp.rc('roles_utilisateurs', 'user_roles_roleId_fkey', 'roles_utilisateurs_role_id_fkey');
SELECT pg_temp.rc('roles_utilisateurs', 'user_roles_delegationId_fkey', 'roles_utilisateurs_delegation_id_fkey');
SELECT pg_temp.rc('membres_organisation', 'organization_members_userId_fkey', 'membres_organisation_utilisateur_id_fkey');
SELECT pg_temp.rc('membres_organisation', 'organization_members_organizationId_fkey', 'membres_organisation_organisation_id_fkey');
SELECT pg_temp.rc('membres_organisation', 'organization_members_roleId_fkey', 'membres_organisation_role_id_fkey');
SELECT pg_temp.rc('jetons_actualisation', 'refresh_tokens_userId_fkey', 'jetons_actualisation_utilisateur_id_fkey');
SELECT pg_temp.rc('jetons_usage_unique', 'one_time_tokens_userId_fkey', 'jetons_usage_unique_utilisateur_id_fkey');
SELECT pg_temp.rc('organisations', 'organizations_delegationId_fkey', 'organisations_delegation_id_fkey');
SELECT pg_temp.rc('organisations', 'organizations_regionId_fkey', 'organisations_region_id_fkey');
SELECT pg_temp.rc('demandes_adhesion', 'membership_requests_categoryId_fkey', 'demandes_adhesion_categorie_id_fkey');
SELECT pg_temp.rc('demandes_adhesion', 'membership_requests_delegationId_fkey', 'demandes_adhesion_delegation_id_fkey');
SELECT pg_temp.rc('demandes_adhesion', 'membership_requests_organizationId_fkey', 'demandes_adhesion_organisation_id_fkey');
SELECT pg_temp.rc('documents_adhesion', 'membership_documents_requestId_fkey', 'documents_adhesion_demande_id_fkey');
SELECT pg_temp.rc('documents_adhesion', 'membership_documents_fileId_fkey', 'documents_adhesion_fichier_id_fkey');
SELECT pg_temp.rc('documents_adhesion', 'membership_documents_reviewedById_fkey', 'documents_adhesion_valide_par_id_fkey');
SELECT pg_temp.rc('evenements_adhesion', 'membership_events_requestId_fkey', 'evenements_adhesion_demande_id_fkey');
SELECT pg_temp.rc('decisions_adhesion', 'membership_decisions_requestId_fkey', 'decisions_adhesion_demande_id_fkey');
SELECT pg_temp.rc('decisions_adhesion', 'membership_decisions_recordedById_fkey', 'decisions_adhesion_enregistre_par_id_fkey');
SELECT pg_temp.rc('paiements_adhesion', 'payment_records_requestId_fkey', 'paiements_adhesion_demande_id_fkey');
SELECT pg_temp.rc('paiements_adhesion', 'payment_records_recordedById_fkey', 'paiements_adhesion_enregistre_par_id_fkey');
SELECT pg_temp.rc('documents', 'internal_documents_fileId_fkey', 'documents_fichier_id_fkey');
SELECT pg_temp.rc('documents', 'internal_documents_organizationId_fkey', 'documents_organisation_id_fkey');
SELECT pg_temp.rc('opportunites', 'opportunities_sheetFileId_fkey', 'opportunites_fichier_fiche_id_fkey');
SELECT pg_temp.rc('opportunites', 'opportunities_organizationId_fkey', 'opportunites_organisation_id_fkey');
SELECT pg_temp.rc('communications_lues', 'communication_reads_communicationId_fkey', 'communications_lues_communication_id_fkey');
SELECT pg_temp.rc('communications_lues', 'communication_reads_userId_fkey', 'communications_lues_utilisateur_id_fkey');
SELECT pg_temp.rc('evenements', 'events_regionId_fkey', 'evenements_region_id_fkey');
SELECT pg_temp.rc('evenements', 'events_organizationId_fkey', 'evenements_organisation_id_fkey');
SELECT pg_temp.rc('rapports', 'reports_organizationId_fkey', 'rapports_organisation_id_fkey');
SELECT pg_temp.rc('rapports', 'reports_authorId_fkey', 'rapports_auteur_id_fkey');
SELECT pg_temp.rc('rapports', 'reports_reviewedById_fkey', 'rapports_valide_par_id_fkey');
SELECT pg_temp.rc('rapports_pieces_jointes', 'report_attachments_reportId_fkey', 'rapports_pieces_jointes_rapport_id_fkey');
SELECT pg_temp.rc('rapports_pieces_jointes', 'report_attachments_fileId_fkey', 'rapports_pieces_jointes_fichier_id_fkey');
SELECT pg_temp.rc('actualites', 'news_proposals_organizationId_fkey', 'actualites_organisation_id_fkey');
SELECT pg_temp.rc('actualites', 'news_proposals_categoryId_fkey', 'actualites_categorie_id_fkey');
SELECT pg_temp.rc('actualites', 'news_proposals_authorId_fkey', 'actualites_auteur_id_fkey');
SELECT pg_temp.rc('actualites', 'news_proposals_reviewedById_fkey', 'actualites_valide_par_id_fkey');
SELECT pg_temp.rc('actualites', 'news_proposals_coverFileId_fkey', 'actualites_fichier_couverture_id_fkey');
SELECT pg_temp.rc('actualites_historique', 'news_status_history_proposalId_fkey', 'actualites_historique_actualite_id_fkey');
SELECT pg_temp.rc('actualites_pieces_jointes', 'news_attachments_proposalId_fkey', 'actualites_pieces_jointes_actualite_id_fkey');
SELECT pg_temp.rc('actualites_pieces_jointes', 'news_attachments_fileId_fkey', 'actualites_pieces_jointes_fichier_id_fkey');
SELECT pg_temp.rc('projets', 'projects_organizationId_fkey', 'projets_organisation_id_fkey');
SELECT pg_temp.rc('projets', 'projects_authorId_fkey', 'projets_auteur_id_fkey');
SELECT pg_temp.rc('projets', 'projects_reviewedById_fkey', 'projets_valide_par_id_fkey');
SELECT pg_temp.rc('projets', 'projects_coverFileId_fkey', 'projets_fichier_couverture_id_fkey');
SELECT pg_temp.rc('projets_pieces_jointes', 'project_attachments_projectId_fkey', 'projets_pieces_jointes_projet_id_fkey');
SELECT pg_temp.rc('projets_pieces_jointes', 'project_attachments_fileId_fkey', 'projets_pieces_jointes_fichier_id_fkey');
SELECT pg_temp.rc('projets_historique', 'project_status_history_projectId_fkey', 'projets_historique_projet_id_fkey');
SELECT pg_temp.ri('delegations_regionId_idx', 'delegations_region_id_idx');
SELECT pg_temp.ri('intervention_domains_code_key', 'domaines_intervention_code_key');
SELECT pg_temp.ri('disability_types_code_key', 'types_handicap_code_key');
SELECT pg_temp.ri('news_categories_code_key', 'categories_actualites_code_key');
SELECT pg_temp.ri('users_email_key', 'utilisateurs_email_key');
SELECT pg_temp.ri('users_status_idx', 'utilisateurs_status_idx');
SELECT pg_temp.ri('user_roles_userId_idx', 'roles_utilisateurs_utilisateur_id_idx');
SELECT pg_temp.ri('organization_members_userId_key', 'membres_organisation_utilisateur_id_key');
SELECT pg_temp.ri('organization_members_organizationId_idx', 'membres_organisation_organisation_id_idx');
SELECT pg_temp.ri('refresh_tokens_tokenHash_key', 'jetons_actualisation_tokenHash_key');
SELECT pg_temp.ri('refresh_tokens_userId_idx', 'jetons_actualisation_utilisateur_id_idx');
SELECT pg_temp.ri('one_time_tokens_tokenHash_key', 'jetons_usage_unique_tokenHash_key');
SELECT pg_temp.ri('one_time_tokens_userId_type_idx', 'jetons_usage_unique_utilisateur_id_type_idx');
SELECT pg_temp.ri('organizations_name_key', 'organisations_name_key');
SELECT pg_temp.ri('organizations_memberNumber_key', 'organisations_memberNumber_key');
SELECT pg_temp.ri('organizations_delegationId_idx', 'organisations_delegation_id_idx');
SELECT pg_temp.ri('organizations_regionId_idx', 'organisations_region_id_idx');
SELECT pg_temp.ri('organizations_isListed_status_idx', 'organisations_isListed_status_idx');
SELECT pg_temp.ri('membership_categories_code_key', 'categories_adhesion_code_key');
SELECT pg_temp.ri('fee_schedules_code_key', 'baremes_cotisations_code_key');
SELECT pg_temp.ri('file_assets_storageKey_key', 'fichiers_storageKey_key');
SELECT pg_temp.ri('membership_requests_reference_key', 'demandes_adhesion_reference_key');
SELECT pg_temp.ri('membership_requests_organizationId_key', 'demandes_adhesion_organisation_id_key');
SELECT pg_temp.ri('membership_requests_status_idx', 'demandes_adhesion_status_idx');
SELECT pg_temp.ri('membership_requests_categoryId_idx', 'demandes_adhesion_categorie_id_idx');
SELECT pg_temp.ri('membership_requests_applicantEmail_idx', 'demandes_adhesion_applicantEmail_idx');
SELECT pg_temp.ri('membership_requests_delegationId_idx', 'demandes_adhesion_delegation_id_idx');
SELECT pg_temp.ri('membership_requests_submittedAt_idx', 'demandes_adhesion_submittedAt_idx');
SELECT pg_temp.ri('membership_documents_requestId_idx', 'documents_adhesion_demande_id_idx');
SELECT pg_temp.ri('membership_events_requestId_createdAt_idx', 'evenements_adhesion_demande_id_createdAt_idx');
SELECT pg_temp.ri('membership_decisions_requestId_idx', 'decisions_adhesion_demande_id_idx');
SELECT pg_temp.ri('payment_records_receiptNumber_key', 'paiements_adhesion_receiptNumber_key');
SELECT pg_temp.ri('payment_records_requestId_idx', 'paiements_adhesion_demande_id_idx');
SELECT pg_temp.ri('internal_documents_category_publishedAt_idx', 'documents_category_publishedAt_idx');
SELECT pg_temp.ri('internal_documents_organizationId_reviewStatus_idx', 'documents_organisation_id_reviewStatus_idx');
SELECT pg_temp.ri('opportunities_reference_key', 'opportunites_reference_key');
SELECT pg_temp.ri('opportunities_organizationId_reviewStatus_idx', 'opportunites_organisation_id_reviewStatus_idx');
SELECT pg_temp.ri('opportunities_status_deadline_idx', 'opportunites_status_deadline_idx');
SELECT pg_temp.ri('opportunities_visibility_idx', 'opportunites_visibility_idx');
SELECT pg_temp.ri('events_organizationId_reviewStatus_idx', 'evenements_organisation_id_reviewStatus_idx');
SELECT pg_temp.ri('events_startsAt_idx', 'evenements_startsAt_idx');
SELECT pg_temp.ri('events_type_idx', 'evenements_type_idx');
SELECT pg_temp.ri('reports_organizationId_submittedAt_idx', 'rapports_organisation_id_submittedAt_idx');
SELECT pg_temp.ri('reports_status_idx', 'rapports_status_idx');
SELECT pg_temp.ri('report_attachments_reportId_idx', 'rapports_pieces_jointes_rapport_id_idx');
SELECT pg_temp.ri('news_proposals_organizationId_updatedAt_idx', 'actualites_organisation_id_updatedAt_idx');
SELECT pg_temp.ri('news_proposals_status_idx', 'actualites_status_idx');
SELECT pg_temp.ri('news_status_history_proposalId_createdAt_idx', 'actualites_historique_actualite_id_createdAt_idx');
SELECT pg_temp.ri('news_attachments_proposalId_idx', 'actualites_pieces_jointes_actualite_id_idx');
SELECT pg_temp.ri('projects_organizationId_updatedAt_idx', 'projets_organisation_id_updatedAt_idx');
SELECT pg_temp.ri('projects_status_idx', 'projets_status_idx');
SELECT pg_temp.ri('project_attachments_projectId_idx', 'projets_pieces_jointes_projet_id_idx');
SELECT pg_temp.ri('project_status_history_projectId_createdAt_idx', 'projets_historique_projet_id_createdAt_idx');

-- 5. Tables de liaison implicites (relations plusieurs-à-plusieurs) : Prisma les nomme d'après les modèles.
DO $m$
DECLARE r record;
BEGIN
  -- Domaines d'intervention : l'ordre des colonnes ne change pas (A = domaine, B = organisation).
  ALTER TABLE "_InterventionDomainToOrganization" RENAME TO "_DomaineInterventionToOrganization";
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"_DomaineInterventionToOrganization"'::regclass AND conname LIKE '\_InterventionDomainToOrganization%' LOOP
    EXECUTE format('ALTER TABLE "_DomaineInterventionToOrganization" RENAME CONSTRAINT %I TO %I', r.conname, replace(r.conname, '_InterventionDomainToOrganization', '_DomaineInterventionToOrganization'));
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = '_DomaineInterventionToOrganization' AND indexname LIKE '\_InterventionDomainToOrganization%' LOOP
    EXECUTE format('ALTER INDEX %I RENAME TO %I', r.indexname, replace(r.indexname, '_InterventionDomainToOrganization', '_DomaineInterventionToOrganization'));
  END LOOP;

  -- Types de handicap : l'ordre alphabétique change (Organization < TypeHandicap), donc A = organisation et B = type.
  -- On renomme la table et on échange les colonnes A et B : les liens existants sont conservés tels quels.
  ALTER TABLE "_DisabilityTypeToOrganization" RENAME TO "_OrganizationToTypeHandicap";
  ALTER TABLE "_OrganizationToTypeHandicap" RENAME COLUMN "A" TO "A_tmp";
  ALTER TABLE "_OrganizationToTypeHandicap" RENAME COLUMN "B" TO "A";
  ALTER TABLE "_OrganizationToTypeHandicap" RENAME COLUMN "A_tmp" TO "B";
  ALTER TABLE "_OrganizationToTypeHandicap" RENAME CONSTRAINT "_DisabilityTypeToOrganization_B_fkey" TO "_OrganizationToTypeHandicap_A_fkey";
  ALTER TABLE "_OrganizationToTypeHandicap" RENAME CONSTRAINT "_DisabilityTypeToOrganization_A_fkey" TO "_OrganizationToTypeHandicap_B_fkey";
  -- Clé primaire / index : on les recrée dans l'ordre (A, B) attendu.
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"_OrganizationToTypeHandicap"'::regclass AND contype IN ('p', 'u') LOOP
    EXECUTE format('ALTER TABLE "_OrganizationToTypeHandicap" DROP CONSTRAINT %I', r.conname);
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = '_OrganizationToTypeHandicap' LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
  ALTER TABLE "_OrganizationToTypeHandicap" ADD CONSTRAINT "_OrganizationToTypeHandicap_AB_pkey" PRIMARY KEY ("A", "B");
  CREATE INDEX "_OrganizationToTypeHandicap_B_index" ON "_OrganizationToTypeHandicap"("B");
END
$m$;

