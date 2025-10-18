using Microsoft.EntityFrameworkCore.Design;

namespace FixMyShot.Helpers
{
    public static class AnalysisHelper
    {
        public static List<string> TipGeneration(float avgElbow, float avgFeet)
        {
            List<string> tips = new List<string>();

            // Elbow angle analysis (ideal range: 90-120 degrees at shot release)
            if (avgElbow < 70)
            {
                tips.Add("Your elbow angle is too tight. Try to extend your arm more for better follow-through.");
            }
            else if (avgElbow >= 70 && avgElbow < 90)
            {
                tips.Add("Your elbow is a bit low. Try lifting it up to shoulder level for optimal shooting form.");
            }
            else if (avgElbow >= 90 && avgElbow <= 120)
            {
                tips.Add("Great elbow position on your shot! Your arm angle is in the optimal range.");
            }
            else if (avgElbow > 120 && avgElbow <= 150)
            {
                tips.Add("Your arm is too straight. Keep a 90-120 degree bend in your elbow at release.");
            }
            else // > 150
            {
                tips.Add("Your arm is fully extended. Lower your release point and maintain a bend in your elbow.");
            }

            // Feet stance analysis (normalized by shoulder width)
            // Ideal: 1.0 - 2.0 (feet roughly shoulder-width to 2x shoulder-width apart)
            if (avgFeet < 0.8f)
            {
                tips.Add("Your feet are too close together. Widen your stance to shoulder-width apart for better balance.");
            }
            else if (avgFeet >= 0.8f && avgFeet <= 2.2f)
            {
                tips.Add("Perfect shooting stance! Your feet are properly positioned for balance and power.");
            }
            else // > 2.2f
            {
                tips.Add("Your stance is too wide. Bring your feet closer to shoulder-width apart for better shot control.");
            }

            return tips;
        }
    }

    public class FramePose
    {
        public int FrameIndex { get; set; }
        public float ElbowAngle { get; set; }
        public float FeetDistance { get; set; }
    }
}