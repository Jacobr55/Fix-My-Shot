using Microsoft.EntityFrameworkCore.Design;

namespace FixMyShot.Helpers
{
    public static class AnalysisHelper
    {



        public static List<string> TipGeneration(float avgElbow, float avgFeet)
        {
            //da tips
            List<string> tips = new List<string>();

            //eblow angle
            if (avgElbow > 90)
            {
                tips.Add("Your elbow is too low. Try lifting it up to shoulder level.");
            }
            else if (avgElbow > 160)
            {
                tips.Add("Your arm is to straight and high, keep a bend in your elbow and lower it to your shoulder level.");
            }
            else
            {
                tips.Add("Great elbow postion on your shot!");
            }

            // feet closeness 
            if(avgFeet < 0.2f)
            {
                tips.Add("Your feet are to close to eachother. Widen your stance so your feet are a shoulder width apart.");
            }
            else if(avgFeet > 0.7f)
            {
                tips.Add("Your stance is too wide. Bring your feet in to so they are a shoulder width apart");
            }
            else
            {
                tips.Add("Perfect shooting stance!");
            }

            return tips;

        }
    }

    public class FramePose
    {
        public int FrameIndex {  get; set; }
        public float ElbowAngle {  get; set; }
        public float FeetDistance { get; set; }
    }
}
