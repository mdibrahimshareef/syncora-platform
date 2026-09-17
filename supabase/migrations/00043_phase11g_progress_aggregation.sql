-- Phase 11G: Progress Aggregation Logic

-- 1. Add progress columns to projects, initiatives, and portfolios
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- 2. Create RPC function to calculate and update all progress natively
CREATE OR REPLACE FUNCTION public.recalculate_all_progress()
RETURNS void AS $$
DECLARE
    p_record RECORD;
    g_record RECORD;
    i_record RECORD;
    po_record RECORD;
    total_tasks INTEGER;
    completed_tasks INTEGER;
    avg_progress INTEGER;
BEGIN
    -- Update Projects Progress
    FOR p_record IN SELECT id FROM public.projects LOOP
        SELECT COUNT(*), COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0)
        INTO total_tasks, completed_tasks
        FROM public.tasks
        WHERE project_id = p_record.id;

        IF total_tasks > 0 THEN
            UPDATE public.projects SET progress = (completed_tasks * 100 / total_tasks) WHERE id = p_record.id;
        ELSE
            UPDATE public.projects SET progress = 0 WHERE id = p_record.id;
        END IF;
    END LOOP;

    -- Update Goals Progress
    FOR g_record IN SELECT id FROM public.goals LOOP
        SELECT COALESCE(AVG(progress), 0) INTO avg_progress
        FROM public.projects
        WHERE goal_id = g_record.id;

        UPDATE public.goals SET progress = avg_progress WHERE id = g_record.id;
    END LOOP;

    -- Update Initiatives Progress
    FOR i_record IN SELECT id FROM public.initiatives LOOP
        SELECT COALESCE(AVG(progress), 0) INTO avg_progress
        FROM public.projects
        WHERE initiative_id = i_record.id;

        UPDATE public.initiatives SET progress = avg_progress WHERE id = i_record.id;
    END LOOP;

    -- Update Portfolios Progress
    FOR po_record IN SELECT id FROM public.portfolios LOOP
        SELECT COALESCE(AVG(p.progress), 0) INTO avg_progress
        FROM public.projects p
        JOIN public.portfolio_projects pp ON pp.project_id = p.id
        WHERE pp.portfolio_id = po_record.id;

        UPDATE public.portfolios SET progress = avg_progress WHERE id = po_record.id;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a trigger function to automatically recalculate progress when a task's status changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- We can call the recalculate_all_progress function.
    -- In a massive database, we would scope this to the specific project/goal,
    -- but for SYNCORA Release 11 this global recalculation is sufficient and guarantees consistency.
    PERFORM public.recalculate_all_progress();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to tasks table
DROP TRIGGER IF EXISTS trigger_task_progress ON public.tasks;
CREATE TRIGGER trigger_task_progress
AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_recalculate_progress();
