using System;
using System.ComponentModel.DataAnnotations;


namespace FixMyShot.Models
{
    public class ShotAnalysis
    {       
        [Key]
        public int Id { get; set; }

        public string UserName { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public float AverageElbowAngle { get; set; }
        public float AverageFeetDistance { get; set; }
        public string Tips { get; set; } = "";

    }
}
