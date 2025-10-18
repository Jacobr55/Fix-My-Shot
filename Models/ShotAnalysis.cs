using System;
using System.ComponentModel.DataAnnotations;


public enum ShotType { Unknown = 0, JumpShot = 1, SetShot = 2 }

public enum Handedness { Unknown = 0, Right = 1, Left = 2 }

public enum FootStance {Unknown = 0, RightForward = 1, LeftForward = 2, Square = 3, Other = 4}




namespace FixMyShot.Models
{
    public class ShotAnalysis
    {
        [Key]
        public int Id { get; set; }

        public string UserName { get; set; } = "";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // High-level numeric metrics
        public float AverageElbowAngle { get; set; }   // degrees
        public float ConsistencyScore { get; set; }    // 0..100 (rates fluidity of shot motion)

        // Shot metadata
        public ShotType ShotType { get; set; } = ShotType.Unknown;
        public Handedness Handedness { get; set; } = Handedness.Unknown;
        public FootStance FootStance { get; set; } = FootStance.Unknown;

        // Timing/frames
        public int? ApexFrame { get; set; }                    // frame index of jump apex  for jumpshot
        public int? ReleaseFrame { get; set; }                 // frame index where release detected/estimated
        public bool ReleaseAtApex { get; set; }                // ReleaseFrame == ApexFrame (or close)

        // feedback - short text summary
        public string Tips { get; set; } = "";                

        // Raw/derived data (store pose keypoints or a summary per frame)
        // Storing as JSON string of sampled frames; helpful for re-analysis and charts
        public string KeypointsJson { get; set; } = "";

        // Optional: annotated video URL (if you create one client or server side)
        public string AnnotatedVideoUrl { get; set; } = "";

    }
}
