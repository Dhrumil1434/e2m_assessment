import { relations } from 'drizzle-orm';
import { regionMaterialAssignments } from './assignments';
import { buildingRegions } from './building-regions';
import { costEstimations, quantityEstimations } from './estimations';
import { jobRecords } from './jobs';
import { materialVariants, materials } from './materials';
import { measurementReferences } from './measurements';
import { projectImages } from './project-images';
import { projects } from './projects';
import { reports } from './reports';

export const projectsRelations = relations(projects, ({ many }) => ({
  images: many(projectImages),
  measurementReferences: many(measurementReferences),
  quantityEstimations: many(quantityEstimations),
  costEstimations: many(costEstimations),
  reports: many(reports),
  jobs: many(jobRecords),
}));

export const projectImagesRelations = relations(projectImages, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectImages.projectId],
    references: [projects.id],
  }),
  regions: many(buildingRegions),
}));

export const buildingRegionsRelations = relations(buildingRegions, ({ one }) => ({
  image: one(projectImages, {
    fields: [buildingRegions.projectImageId],
    references: [projectImages.id],
  }),
  assignment: one(regionMaterialAssignments, {
    fields: [buildingRegions.id],
    references: [regionMaterialAssignments.regionId],
  }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  variants: many(materialVariants),
}));

export const materialVariantsRelations = relations(materialVariants, ({ one }) => ({
  material: one(materials, {
    fields: [materialVariants.materialId],
    references: [materials.id],
  }),
}));

export const regionMaterialAssignmentsRelations = relations(
  regionMaterialAssignments,
  ({ one }) => ({
    region: one(buildingRegions, {
      fields: [regionMaterialAssignments.regionId],
      references: [buildingRegions.id],
    }),
    variant: one(materialVariants, {
      fields: [regionMaterialAssignments.materialVariantId],
      references: [materialVariants.id],
    }),
  }),
);

export const measurementReferencesRelations = relations(
  measurementReferences,
  ({ one }) => ({
    project: one(projects, {
      fields: [measurementReferences.projectId],
      references: [projects.id],
    }),
    region: one(buildingRegions, {
      fields: [measurementReferences.regionId],
      references: [buildingRegions.id],
    }),
  }),
);

export const quantityEstimationsRelations = relations(
  quantityEstimations,
  ({ one }) => ({
    project: one(projects, {
      fields: [quantityEstimations.projectId],
      references: [projects.id],
    }),
    material: one(materials, {
      fields: [quantityEstimations.materialId],
      references: [materials.id],
    }),
    region: one(buildingRegions, {
      fields: [quantityEstimations.regionId],
      references: [buildingRegions.id],
    }),
  }),
);

export const costEstimationsRelations = relations(costEstimations, ({ one }) => ({
  project: one(projects, {
    fields: [costEstimations.projectId],
    references: [projects.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
}));

export const jobRecordsRelations = relations(jobRecords, ({ one }) => ({
  project: one(projects, {
    fields: [jobRecords.projectId],
    references: [projects.id],
  }),
}));
