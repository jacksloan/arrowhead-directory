


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."business_status" AS ENUM (
    'approved',
    'pending',
    'rejected',
    'deleted'
);


ALTER TYPE "public"."business_status" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "email" "text" NOT NULL
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_categories" (
    "business_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."business_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_services" (
    "business_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."business_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phones" "text"[] DEFAULT '{}'::"text"[],
    "address" "text",
    "website" "text",
    "description" "text",
    "category" "text" NOT NULL,
    "subcategories" "text"[] DEFAULT '{}'::"text"[],
    "services" "text"[] DEFAULT '{}'::"text"[],
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."business_status" DEFAULT 'pending'::"public"."business_status" NOT NULL
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shortname" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_request_votes" (
    "request_id" "uuid" NOT NULL,
    "user_email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_request_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "creator_email" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shortname" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suggested_edits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "suggested_by" "text" NOT NULL,
    "status" "public"."business_status" DEFAULT 'pending'::"public"."business_status" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phones" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "address" "text",
    "website" "text",
    "description" "text",
    "category" "text" NOT NULL,
    "subcategories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "services" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suggested_edits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_pkey" PRIMARY KEY ("business_id", "category_id");



ALTER TABLE ONLY "public"."business_services"
    ADD CONSTRAINT "business_services_pkey" PRIMARY KEY ("business_id", "service_id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_shortname_key" UNIQUE ("shortname");



ALTER TABLE ONLY "public"."feature_request_votes"
    ADD CONSTRAINT "feature_request_votes_pkey" PRIMARY KEY ("request_id", "user_email");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_shortname_key" UNIQUE ("shortname");



ALTER TABLE ONLY "public"."suggested_edits"
    ADD CONSTRAINT "suggested_edits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_categories"
    ADD CONSTRAINT "business_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_services"
    ADD CONSTRAINT "business_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_services"
    ADD CONSTRAINT "business_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_request_votes"
    ADD CONSTRAINT "feature_request_votes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suggested_edits"
    ADD CONSTRAINT "suggested_edits_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins can delete admins" ON "public"."admins" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admins" "admins_1"
  WHERE ("admins_1"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can delete categories" ON "public"."categories" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can delete services" ON "public"."services" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can insert admins" ON "public"."admins" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins" "admins_1"
  WHERE ("admins_1"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can read all suggestions" ON "public"."suggested_edits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can update categories" ON "public"."categories" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can update feature_requests" ON "public"."feature_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can update services" ON "public"."services" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "admins can update suggestions" ON "public"."suggested_edits" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "authenticated can insert categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated can insert feature_requests" ON "public"."feature_requests" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("creator_email" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "authenticated can insert services" ON "public"."services" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated can insert vote" ON "public"."feature_request_votes" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_email" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "authenticated can read admins" ON "public"."admins" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."business_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_request_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner or admin can delete business_categories" ON "public"."business_categories" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."businesses"
  WHERE (("businesses"."id" = "business_categories"."business_id") AND ("businesses"."email" = ("auth"."jwt"() ->> 'email'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "owner or admin can delete business_services" ON "public"."business_services" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."businesses"
  WHERE (("businesses"."id" = "business_services"."business_id") AND ("businesses"."email" = ("auth"."jwt"() ->> 'email'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "owner or admin can insert business_categories" ON "public"."business_categories" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."businesses"
  WHERE (("businesses"."id" = "business_categories"."business_id") AND ("businesses"."email" = ("auth"."jwt"() ->> 'email'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "owner or admin can insert business_services" ON "public"."business_services" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."businesses"
  WHERE (("businesses"."id" = "business_services"."business_id") AND ("businesses"."email" = ("auth"."jwt"() ->> 'email'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."email" = ("auth"."jwt"() ->> 'email'::"text"))))));



CREATE POLICY "owner update" ON "public"."businesses" FOR UPDATE USING ((("auth"."jwt"() ->> 'email'::"text") = "email"));



CREATE POLICY "public can read business_categories" ON "public"."business_categories" FOR SELECT USING (true);



CREATE POLICY "public can read business_services" ON "public"."business_services" FOR SELECT USING (true);



CREATE POLICY "public can read categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "public can read feature_requests" ON "public"."feature_requests" FOR SELECT USING (true);



CREATE POLICY "public can read services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "public can read votes" ON "public"."feature_request_votes" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."businesses" FOR SELECT USING (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suggested_edits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user can delete own vote" ON "public"."feature_request_votes" FOR DELETE USING (("user_email" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "users can insert their own suggestions" ON "public"."suggested_edits" FOR INSERT WITH CHECK (("suggested_by" = ("auth"."jwt"() ->> 'email'::"text")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."business_categories" TO "anon";
GRANT ALL ON TABLE "public"."business_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."business_categories" TO "service_role";



GRANT ALL ON TABLE "public"."business_services" TO "anon";
GRANT ALL ON TABLE "public"."business_services" TO "authenticated";
GRANT ALL ON TABLE "public"."business_services" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."feature_request_votes" TO "anon";
GRANT ALL ON TABLE "public"."feature_request_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_request_votes" TO "service_role";



GRANT ALL ON TABLE "public"."feature_requests" TO "anon";
GRANT ALL ON TABLE "public"."feature_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_requests" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."suggested_edits" TO "anon";
GRANT ALL ON TABLE "public"."suggested_edits" TO "authenticated";
GRANT ALL ON TABLE "public"."suggested_edits" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































