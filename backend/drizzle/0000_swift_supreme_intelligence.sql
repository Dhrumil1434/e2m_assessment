CREATE TYPE "public"."calculation_type" AS ENUM('paint', 'tile', 'stone', 'linear', 'railing');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('segmentation', 'rendering', 'refine', 'report');--> statement-breakpoint
CREATE TYPE "public"."quality_status" AS ENUM('pass', 'fail');--> statement-breakpoint
CREATE TYPE "public"."region_status" AS ENUM('proposed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."region_type" AS ENUM('wall', 'window', 'door', 'balcony', 'pillar', 'gate', 'railing', 'roof');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"blur_score" double precision,
	"quality_status" "quality_status" DEFAULT 'pass' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "building_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_image_id" uuid NOT NULL,
	"type" "region_type" NOT NULL,
	"label" varchar(255) NOT NULL,
	"mask_storage_key" varchar(512),
	"polygon_json" jsonb,
	"bbox_json" jsonb,
	"pixel_area" integer,
	"area_sq_ft" double precision,
	"status" "region_status" DEFAULT 'proposed' NOT NULL,
	"confidence" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"texture_storage_key" varchar(512),
	"color_hex" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"calculation_type" "calculation_type" NOT NULL,
	"coverage_per_unit" double precision,
	"tile_width_ft" double precision,
	"tile_height_ft" double precision,
	"wastage_percent" double precision DEFAULT 10 NOT NULL,
	"material_rate" double precision NOT NULL,
	"labor_rate" double precision NOT NULL,
	"labor_unit" varchar(50) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_material_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"material_variant_id" uuid NOT NULL,
	"preview_storage_key" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "region_material_assignments_region_id_unique" UNIQUE("region_id")
);
--> statement-breakpoint
CREATE TABLE "measurement_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"reference_width_ft" double precision NOT NULL,
	"reference_width_px" double precision NOT NULL,
	"scale_ft_per_px" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_estimations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"line_items" jsonb NOT NULL,
	"material_total" double precision NOT NULL,
	"labor_total" double precision NOT NULL,
	"contingency" double precision NOT NULL,
	"grand_total" double precision NOT NULL,
	"range_low" double precision NOT NULL,
	"range_high" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quantity_estimations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"area_sq_ft" double precision NOT NULL,
	"base_quantity" double precision NOT NULL,
	"wastage_quantity" double precision NOT NULL,
	"final_quantity" double precision NOT NULL,
	"unit" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"bull_job_id" varchar(255),
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_regions" ADD CONSTRAINT "building_regions_project_image_id_project_images_id_fk" FOREIGN KEY ("project_image_id") REFERENCES "public"."project_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_variants" ADD CONSTRAINT "material_variants_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_material_assignments" ADD CONSTRAINT "region_material_assignments_region_id_building_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."building_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_material_assignments" ADD CONSTRAINT "region_material_assignments_material_variant_id_material_variants_id_fk" FOREIGN KEY ("material_variant_id") REFERENCES "public"."material_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_references" ADD CONSTRAINT "measurement_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_references" ADD CONSTRAINT "measurement_references_region_id_building_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."building_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_estimations" ADD CONSTRAINT "cost_estimations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_estimations" ADD CONSTRAINT "quantity_estimations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_estimations" ADD CONSTRAINT "quantity_estimations_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_estimations" ADD CONSTRAINT "quantity_estimations_region_id_building_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."building_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_records" ADD CONSTRAINT "job_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;